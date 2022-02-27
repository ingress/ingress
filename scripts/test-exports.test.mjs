import { createRequire } from 'node:module'
import { relative } from 'node:path'

import 'reflect-metadata'
import { test } from 'uvu'
import * as t from 'uvu/assert'

const requireCjs = createRequire(import.meta.url),
  packageJson = requireCjs('../package.json')

packageJson.workspaces.forEach((x) => {
  test(`module ${x}`, async () => {
    let name = relative('./packages', x)
    if (!['reflect-annotations', 'ingress', 'router-tree-map'].includes(name)) {
      name = `@ingress/${name}`
    }
    try {
      const cjsExports = Object.keys(requireCjs(name)).sort(),
        mod = await import(name)
      t.equal(cjsExports, Object.keys(mod).sort(), `cjs and esm exports are equivalent for ${name}`)
    } catch (e) {
      t.unreachable(`Failed loading ${name}:\n\t ` + e.stack)
    }
  })
})

test.run()
