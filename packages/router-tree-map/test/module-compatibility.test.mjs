import { test } from 'node:test'
import assert from 'node:assert'
import { createRequire } from 'node:module'

import * as esmExports from '../index.mjs'

const require = createRequire(import.meta.url)
const cjsExports = require('../lib/cjs/tree.js')

test('ESM and CJS entry points export the same classes', () => {
  assert.ok(esmExports.Router, 'ESM exports Router')
  assert.ok(esmExports.TreeNode, 'ESM exports TreeNode')
  assert.ok(cjsExports.Router, 'CJS exports Router')
  assert.ok(cjsExports.TreeNode, 'CJS exports TreeNode')
  assert.strictEqual(
    cjsExports.Router,
    esmExports.Router,
    'Router class is identical between CJS and ESM exports',
  )
  assert.strictEqual(
    cjsExports.TreeNode,
    esmExports.TreeNode,
    'TreeNode class is identical between CJS and ESM exports',
  )
})

test('Router instances from ESM and CJS are compatible', () => {
  const esmRouter = new esmExports.Router()
  const cjsRouter = new cjsExports.Router()

  assert.ok(
    esmRouter instanceof cjsExports.Router,
    'ESM Router instance passes instanceof check with CJS Router',
  )
  assert.ok(
    cjsRouter instanceof esmExports.Router,
    'CJS Router instance passes instanceof check with ESM Router',
  )
})

test('TreeNode instances from ESM and CJS are compatible', () => {
  const esmTreeNode = new esmExports.TreeNode()
  const cjsTreeNode = new cjsExports.TreeNode()

  // Both should be instances of each other's constructors since they're the same class
  assert.ok(
    esmTreeNode instanceof cjsExports.TreeNode,
    'ESM TreeNode instance passes instanceof check with CJS TreeNode',
  )
  assert.ok(
    cjsTreeNode instanceof esmExports.TreeNode,
    'CJS TreeNode instance passes instanceof check with ESM TreeNode',
  )
})

test('Mixed module usage produces identical results', () => {
  // Create routers from different modules
  const esmRouter = new esmExports.Router()
  const cjsRouter = new cjsExports.Router()

  // Add the same routes to both
  const handler1 = () => 'route1'
  const handler2 = () => 'route2'
  const handler3 = () => 'param route'

  esmRouter.on('GET', '/', handler1)
  esmRouter.on('POST', '/submit', handler2)
  esmRouter.on('GET', '/user/:id', handler3)

  cjsRouter.on('GET', '/', handler1)
  cjsRouter.on('POST', '/submit', handler2)
  cjsRouter.on('GET', '/user/:id', handler3)

  // Test identical routes return identical results
  const testCases = [
    ['GET', '/'],
    ['POST', '/submit'],
    ['GET', '/user/123'],
    ['GET', '/nonexistent'],
  ]

  testCases.forEach(([method, path]) => {
    const esmResult = esmRouter.find(method, path)
    const cjsResult = cjsRouter.find(method, path)

    assert.strictEqual(esmResult.handle, cjsResult.handle, `Handlers match for ${method} ${path}`)
    assert.deepStrictEqual(esmResult.params, cjsResult.params, `Params match for ${method} ${path}`)
  })
})
