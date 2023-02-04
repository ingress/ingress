import assert from 'node:assert'
import { createRequire } from 'node:module'
import { relative } from 'node:path'
import 'reflect-metadata'

const requireCjs = createRequire(import.meta.url),
  packageJson = requireCjs('../package.json')

for (const module of packageJson.workspaces) {
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
