#!/usr/bin/env node
import { existsSync as exists, readFileSync as readFile, writeFileSync as writeFile } from 'node:fs'
import { resolve, relative } from 'node:path'
import { argv, cwd as getCwd } from 'node:process'
import { error as log } from 'node:console'
import { spawnSync as spawn } from 'node:child_process'
import { serialize, deserialize } from 'node:v8'
import stripJsonComments from 'strip-json-comments'

function clone(obj) {
  return deserialize(serialize(obj))
}

const help = `
  Usage: tsc-build --project <project> --altOutDir <dest>
  Example:
    tsc-build --project tsconfig.cjs.json --altOutDir lib/esm
  Arguments: (Required)
    --project <project>   A path to the project tsconfig file
    --altOutDir <dest>    A path to the destination package.json file if an alternate package module type output is wanted

  Description:
    This script toggles the "type" field in a package.json file between 'module' and 'commonjs'
    Running \`tsc\` for each configuration.
    The off-type is written to the path presented in --altOutDir
    The project tsconfig should specify \`"module": "NodeNext"\`, a sourceRoot, and an outDir
`

function parseArgs() {
  const args = {
    project: argv[argv.findIndex((x) => x === '--project') + 1],
    cwd: argv.includes('--cwd') ? argv[argv.findIndex((x) => x === '--cwd') + 1] : getCwd(),
    altOutDir: argv[argv.findIndex((x) => x === '--altOutDir') + 1],
  }

  if (argv.findIndex((x) => x === '--project') === -1) {
    args.project = undefined
  }

  if (argv.findIndex((x) => x === '--altOutDir') === -1) {
    args.altOutDir = undefined
  }

  return args
}

function runTsc(args, outDir = null) {
  const tscArgs = ['--project', args.project]
  if (outDir) {
    tscArgs.push('--outDir', outDir)
  }
  const result = spawn('tsc', tscArgs, { stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`TypeScript compilation failed with exit code ${result.status}`)
  }
}

function main() {
  try {
    process.exitCode = 1

    const { project: projectFilename, cwd, altOutDir: rawAltOutDir } = parseArgs()

    // Validate arguments
    if (!projectFilename) {
      log(help)
      throw new Error('A project file must be specified (--project)')
    }

    const opts = checkArgs(projectFilename, cwd)
    const altOutDir = rawAltOutDir ? resolve(cwd, rawAltOutDir) : undefined

    // Build in the default (root package) configuration
    runTsc(opts)

    if (!altOutDir) return

    const { pkg, pkgPath } = opts
    const originalPkgJson = clone(pkg)

    try {
      // Switch the type field in package.json
      writeFile(pkgPath, stringify(toggleType(pkg)))

      // Build in the toggled type overriding outDir, to the alternate
      runTsc(opts, altOutDir)
    } finally {
      // Restore original package.json
      writeFile(pkgPath, stringify(originalPkgJson))
    }

    // Create a new package.json in the altDir with ESM-specific configuration
    const modifiedPkg = prepareEsmPackage(pkg, altOutDir)
    writeFile(resolve(altOutDir, 'package.json'), stringify(modifiedPkg))

    process.exitCode = 0
  } catch (error) {
    log(`Error: ${error.message}`)
    if (error.cause) {
      log(`Cause: ${error.cause.message}`)
    }
    process.exitCode = 1
  }
}

function checkArgs(projectFilename, cwd) {
  const project = resolve(cwd, projectFilename)
  if (!exists(project)) {
    throw new Error(`The project file "${projectFilename}" does not exist`)
  }

  const tsProjectConfig = parse(
    stripJsonComments(readFile(project, 'utf-8')),
    'The project tsconfig could not be parsed',
  )
  const root = tsProjectConfig?.extends ? resolve(cwd, tsProjectConfig.extends) : undefined
  if (root) {
    const rootConfig = parse(
      stripJsonComments(readFile(root, 'utf-8')),
      'The root tsconfig could not be parsed',
    )
    tsProjectConfig.compilerOptions = { ...rootConfig.compilerOptions, ...tsProjectConfig.compilerOptions }
  }
  const { outDir, sourceRoot, module } = tsProjectConfig?.compilerOptions ?? {}
  const pkgPath = resolve(cwd, 'package.json')

  if (!outDir) {
    log(help)
    throw new Error('The project tsconfig#compilerOptions must specify an outDir')
  }

  if (!sourceRoot) {
    log(help)
    throw new Error('The project tsconfig#compilerOptions must specify a sourceRoot')
  }

  if (module?.toLowerCase() !== 'nodenext') {
    log(help)
    throw new Error('The project tsconfig#compilerOptions must specify "module": "NodeNext"')
  }

  if (!exists(pkgPath)) {
    log(help)
    throw new Error('A package.json file must be present in the project')
  }

  const pkg = parse(readFile(pkgPath, 'utf-8'), 'The package.json could not be parsed')

  return {
    outDir,
    sourceRoot,
    project,
    cwd,
    pkg,
    pkgPath,
  }
}

/**
 * Adjust paths in package.json #imports or #exports for a sub-package
 * @param {string} altDir - The alternate output directory
 * @param {object} obj - A package.json #imports or #exports like object
 */
function adjustPaths(altDir, obj) {
  if (!obj) return

  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Convert paths to be relative to the altDir
      const relativePath = relative(altDir, obj[key])
      obj[key] = `./${relativePath}`
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      adjustPaths(altDir, obj[key])
    }
  }
}

/**
 * Prepare package.json for ESM output
 * @param {object} pkg - The package.json content
 * @param {string} altDir - The alternate output directory
 * @returns {object} The modified package object
 */
function prepareEsmPackage(pkg, altDir) {
  const modifiedPkg = clone(pkg)

  // Set type to module for ESM output
  modifiedPkg.type = 'module'

  // Adjust exports paths while preserving structure
  if (modifiedPkg.exports) {
    adjustPaths(altDir, modifiedPkg.exports)
  }

  // Adjust imports paths if they exist
  if (modifiedPkg.imports) {
    adjustPaths(altDir, modifiedPkg.imports)
  }

  return modifiedPkg
}

/**
 * Switch the type field between 'module' and 'commonjs'
 * @param {object} pkg - The package.json content
 * @returns {object} The modified package object
 */
function toggleType(pkg) {
  pkg.type = pkg.type === 'module' ? 'commonjs' : 'module'
  return pkg
}

function stringify(pkg) {
  return JSON.stringify(pkg, null, 2)
}

function parse(content, errorMessage) {
  try {
    return JSON.parse(content)
  } catch (e) {
    throw new TypeError(errorMessage, { cause: e })
  }
}

main()
