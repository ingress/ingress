import 'reflect-metadata'
import assert from 'node:assert'
import { createRequire } from 'node:module'
import { relative, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const requireCjs = createRequire(import.meta.url),
  dir = dirname(fileURLToPath(import.meta.url)),
  workspaces = JSON.parse(readFileSync(join(dir, '../pnpm-workspace.yaml')))

for (const module of workspaces.packages) {
  let name = relative('./packages', module)
  if (!['reflect-annotations', 'ingress', 'router-tree-map'].includes(name)) {
    name = `@ingress/${name}`
  }
  try {
    const cjsExports = Object.keys(requireCjs(name)).sort(),
      mod = await import(name)
    assert.deepEqual(
      cjsExports,
      Object.keys(mod).sort(),
      `Expected cjs and esm exports to be equivalent for ${name}\nESM:\n\t` +
        Object.keys(mod).sort().join(',\n\t') +
        '\n\nCJS:\n\t' +
        cjsExports.join(',\n\t')
    )
  } catch (e) {
    throw `Failed loading ${name}:\n\t ` + e.stack
  }
}

assert.ok(workspaces.packages.length > 5)
