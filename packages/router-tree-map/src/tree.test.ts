import t from 'tap'
import { TreeNode, Router } from './tree.js'

type Test = Omit<typeof t, 'mocha' | 'mochaGlobals' | 'Test'>

function checkPriorities(t: Test, n: any) {
  let priority = 0
  n.children.forEach((x: any, i: number) => {
    priority += checkPriorities(t, n.children[i])
  })
  if (n.handle !== null) {
    priority++
  }

  t.equal(
    n.priority,
    priority,
    `priority mismatch for node '${n.path}': is ${n.priority}, should be ${priority}`
  )
  return priority
}

function testRoutes(t: Test, routes: [string, boolean][]) {
  const tree = new TreeNode<any>()
  for (const [route, conflict] of routes) {
    let err: Error | null = null
    try {
      tree.set(route, null)
    } catch (e: any) {
      err = e
    }
    if (conflict) {
      t.ok(err, `no error for conflicting route ${route}`)
    } else {
      t.notOk(err, `unexpected error for route ${route}: ${err?.message}`)
    }
  }
}

function fakeHandler<T>(arg: T) {
  return () => arg
}

function checkRequests(
  t: Test,
  tree: TreeNode<any>,
  requests: [string, boolean, string, [string, string][] | null][]
) {
  for (const [path, noHandle, route, expectedParams] of requests) {
    const value = tree.get(path)
    if (noHandle) {
      t.notOk(value.handle, `Expected null handle but got ${value.handle} for '${path}'`)
    } else {
      const val = value.handle()
      t.equal(
        val,
        route,
        `Expected fake handler to return registered route '${route}', but got '${val}'`
      )
    }
    if (expectedParams) {
      t.same(value.params, expectedParams, 'Expected the correct params')
    }
  }
}

t.test('set and get', (t) => {
  const map = new TreeNode()
  ;[
    '/hi',
    '/contact',
    '/co',
    '/c',
    '/a',
    '/ab',
    '/doc/',
    '/doc/go_faq.html',
    '/doc/go1.html',
    '/α',
    '/β',
  ].forEach((x) => map.set(x, fakeHandler(x)))
  checkRequests(t, map, [
    ['/hello', true, '', null],
    ['/a', false, '/a', null],
    ['/', true, '', null],
    ['/hi', false, '/hi', null],
    ['/contact', false, '/contact', null],
    ['/co', false, '/co', null],
    ['/con', true, '', null],
    ['/cona', true, '', null],
    ['/no', true, '', null],
    ['/ab', false, '/ab', null],
    ['/α', false, '/α', null],
    ['/β', false, '/β', null],
  ])
  checkPriorities(t, map)
  t.end()
})

t.test('wildcard routes', (t) => {
  const map = new TreeNode()
  ;[
    '/',
    '/cmd/:tool/:sub',
    '/cmd/:tool/',
    '/cmd/whoami',
    '/cmd/whoami/root/',
    '/src/*filepath',
    '/search/',
    '/search/:query',
    '/user_:name',
    '/user_:name/about',
    '/files/:dir/*filepath',
    '/doc/',
    '/doc/go_faq.html',
    '/doc/go1.html',
    '/info/:user/public',
    '/info/:user/project/:project',
  ].forEach((x) => map.set(x, fakeHandler(x)))

  checkPriorities(t, map)

  checkRequests(t, map, [
    ['/', false, '/', null],
    ['/cmd/test', true, '/cmd/:tool/', [['tool', 'test']]],
    ['/cmd/test/', false, '/cmd/:tool/', [['tool', 'test']]],
    ['/cmd/whoami', false, '/cmd/whoami', null],
    ['/cmd/whoami/', true, '/cmd/whoami', null],
    ['/cmd/whoami/root/', false, '/cmd/whoami/root/', null],
    ['/cmd/whoami/root', true, '/cmd/whoami/root/', null],
    [
      '/cmd/test/3',
      false,
      '/cmd/:tool/:sub',
      [
        ['tool', 'test'],
        ['sub', '3'],
      ],
    ],
    ['/src/', false, '/src/*filepath', [['filepath', '/']]],
    ['/src/some/file.png', false, '/src/*filepath', [['filepath', '/some/file.png']]],
    ['/search/', false, '/search/', null],
    ['/search/someth!ng+in+ünìcodé', false, '/search/:query', [['query', 'someth!ng+in+ünìcodé']]],
    ['/search/someth!ng+in+ünìcodé/', true, '', [['query', 'someth!ng+in+ünìcodé']]],
    ['/user_gopher', false, '/user_:name', [['name', 'gopher']]],
    ['/user_gopher/about', false, '/user_:name/about', [['name', 'gopher']]],
    [
      '/files/js/inc/framework.js',
      false,
      '/files/:dir/*filepath',
      [
        ['dir', 'js'],
        ['filepath', '/inc/framework.js'],
      ],
    ],
    ['/info/gordon/public', false, '/info/:user/public', [['user', 'gordon']]],
    [
      '/info/gordon/project/go',
      false,
      '/info/:user/project/:project',
      [
        ['user', 'gordon'],
        ['project', 'go'],
      ],
    ],
  ])
  t.end()
})

t.test('wildcard conflict', (t) => {
  testRoutes(t, [
    ['/cmd/:tool/:sub', false],
    ['/cmd/vet', false],
    ['/foo/bar', false],
    ['/foo/:name', false],
    ['/foo/:names', true],
    ['/cmd/*path', true],
    ['/cmd/:badvar', true],
    ['/cmd/:tool/names', false],
    ['/cmd/:tool/:badsub/details', true],
    ['/src/*filepath', false],
    ['/src/:file', true],
    ['/src/static.json', true],
    ['/src/*filepathx', true],
    ['/src/', true],
    ['/src/foo/bar', true],
    ['/src1/', false],
    ['/src1/*filepath', true],
    ['/src2*filepath', true],
    ['/src2/*filepath', false],
    ['/search/:query', false],
    ['/search/valid', false],
    ['/user_:name', false],
    ['/user_x', false],
    ['/user_:name', false], //duplicate route doesn't generate conflict because `testRoutes` uses a null handle
    ['/id:id', false],
    ['/id/:id', false],
  ])
  t.end()
})

t.test('Invalid node type', (t) => {
  const map = new TreeNode()
  map.set('/', fakeHandler('/'))
  map.set('/:page', fakeHandler('/:page'))
  ;(map as any).children[0].type = 42
  t.throws(() => map.get('/test'))
  t.end()
})

t.test('Invalid wildcards', (t) => {
  testRoutes(t, [
    ['/non-leading-*wild', true],
    ['/*wild/static', true],
    ['/*wild:withbadchar', true],
  ])
  t.end()
})

t.test('Method Router', (t) => {
  t.test('path registration', (t) => {
    const router = new Router(),
      handle = {}
    router.on('GET', '/some/:path', handle)
    const result = router.find('GET', '/some/thing')
    t.equal(result?.handle, handle)
    t.end()
  })
  t.test('throws on invalid input', (t) => {
    const router = new Router(),
      handle = {}
    t.throws(() => router.on(Math.random().toString() as any, '/some/:path', handle))
    t.throws(() => router.on('GET', 'un-prefixed/route', handle))
    t.end()
  })
  t.test('no registered method/route', (t) => {
    const router = new Router(),
      result = router.find('GET', '/some/path')
    t.same(result, { handle: null, params: [] })
    t.end()
  })
  t.end()
})

t.test('tree child conflict', (t) => {
  const routes = [
    ['/cmd/vet', false],
    ['/cmd/:tool', false],
    ['/cmd/:tool/:sub', false],
    ['/cmd/:tool/misc', false],
    ['/cmd/:tool/:othersub', true],
    ['/src/AUTHORS', false],
    ['/src/*filepath', true],
    ['/user_x', false],
    ['/user_:name', false],
    ['/id/:id', false],
    ['/id:id', false],
    ['/:id', false],
    ['/*filepath', true],
  ] as [string, boolean][]
  testRoutes(t, routes)
  t.end()
})

t.test('duplicate path', (t) => {
  const map = new TreeNode(),
    routes = ['/', '/doc/', '/src/*filepath', '/search/:query', '/user_:name'],
    add = (handler: any) => routes.forEach((x) => map.set(x, handler))
  add({})
  t.throws(() => add(null))
  t.end()
})

t.test('unnamed wildcard', (t) => {
  const map = new TreeNode()
  t.throws(() => map.set('/not-named/*', null))
  t.end()
})

t.test('unimplemented', (t) => {
  t.skip('unescaped params', (t) => {
    const map = new TreeNode(),
      routes = [
        '/',
        '/cmd/:tool/:sub',
        '/cmd/:tool/',
        '/src/*filepath',
        '/search/:query',
        '/files/:dir/*filepath',
        '/info/:user/project/:project',
        '/info/:user',
      ]
    for (const route of routes) {
      map.set(route, {})
    }
    const input = [
      ['/', false, '/', null],
      ['/cmd/test/', false, '/cmd/:tool/', [['tool', 'test']]],
      ['/cmd/test', true, '', [['tool', 'test']]],
      ['/src/some/file.png', false, '/src/*filepath', [['filepath', '/some/file.png']]],
      ['/src/some/file+test.png', false, '/src/*filepath', [['filepath', '/some/file test.png']]],
      [
        '/src/some/file++++%%%%test.png',
        false,
        '/src/*filepath',
        [['filepath', '/some/file++++%%%%test.png']],
      ],
      ['/src/some/file%2Ftest.png', false, '/src/*filepath', [['filepath', '/some/file/test.png']]],
      [
        '/search/someth!ng+in+ünìcodé',
        false,
        '/search/:query',
        [['query', 'someth!ng in ünìcodé']],
      ],
      [
        '/info/gordon/project/go',
        false,
        '/info/:user/project/:project',
        [
          ['user', 'gordon'],
          ['project', 'go'],
        ],
      ],
      ['/info/slash%2Fgordon', false, '/info/:user', [['user', 'slash/gordon']]],
      [
        '/info/slash%2Fgordon/project/Project%20%231',
        false,
        '/info/:user/project/:project',
        [
          ['user', 'slash/gordon'],
          ['project', 'Project #1'],
        ],
      ],
      ['/info/slash%%%%', false, '/info/:user', [['user', 'slash%%%%']]],
      [
        '/info/slash%%%%2Fgordon/project/Project%%%%20%231',
        false,
        '/info/:user/project/:project',
        [
          ['user', 'slash%%%%2Fgordon'],
          ['project', 'Project%%%%20%231'],
        ],
      ],
    ]
    void input
    t.end()
  })
  t.end()
})
