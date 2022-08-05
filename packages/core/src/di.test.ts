import { test } from 'uvu'
import * as t from 'uvu/assert'
import 'reflect-metadata'
import { ModuleContainer, InjectionToken, ContextToken } from './di.js'

test('findProvidedSingleton', () => {
  class A {}
  class B {}
  const container = new ModuleContainer(),
    singleton = {},
    token = new InjectionToken('singleton'),
    a = new A()

  container.registerSingleton({ useValue: singleton, provide: token })
  container.registerSingleton({ useValue: a, provide: A })
  container.registerSingleton(B)
  t.is(singleton, container.findProvidedSingleton(token))
  t.is(a, container.findProvidedSingleton(A))
})

test('hostless, plain di', () => {
  const container = new ModuleContainer()
  class A {}
  class B {}
  container.registerSingleton(A)
  container.registerScoped(B)
  container.start()

  t.throws(() => container.registerScoped(A))
  t.throws(() => container.registerSingleton(B))
  const ctx = {},
    scoped = container.createChildWithContext(ctx)

  t.throws(() => container.get(B))

  t.is(ctx, scoped.get(ContextToken))
  t.instance(scoped.get(A), A)
  t.instance(container.get(A), A)
  t.is(scoped.get(A), container.get(A))
  t.instance(scoped.get(B), B)
})

test.run()
