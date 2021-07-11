import { createRequire } from 'module'
import t from 'tap'
import { relative } from 'path'

const requireCjs = createRequire(import.meta.url),
  packageJson = requireCjs('../package.json')

t.plan(packageJson.workspaces.length + 1)
t.ok(packageJson.workspaces.length > 1)

for (const x of packageJson.workspaces) {
  let name = relative('./packages', x)
  if (!['reflect-annotations', 'ingress', 'router-tree-map'].includes(name)) {
    name = `@ingress/${name}`
  }
  const cjsExports = Object.keys(requireCjs(name)).sort()
  import(name).then((x) => {
    t.same(cjsExports, Object.keys(x).sort(), `cjs and esm exports are equivalent for ${name}`)
  })
}
