import { createRequire } from 'node:module'
import { relative } from 'node:path'

import { test } from 'uvu'
import * as t from 'uvu/assert'

const requireCjs = createRequire(import.meta.url),
  packageJson = requireCjs('../package.json')

test('equivalent modules', async () => {
  let plan = 0
  const planned = packageJson.workspaces.length

  t.ok(planned > 1, `Expected to have more than (${planned}) modules to test`)
  for (const x of packageJson.workspaces) {
    let name = relative('./packages', x)
    if (!['reflect-annotations', 'ingress', 'router-tree-map'].includes(name)) {
      name = `@ingress/${name}`
    }
    plan++
    const cjsExports = Object.keys(requireCjs(name)).sort(),
      mod = await import(name)

    t.equal(cjsExports, Object.keys(mod).sort(), `cjs and esm exports are equivalent for ${name}`)
  }
  t.equal(plan, planned, 'expected to have more modules to test')
})

test.run()
