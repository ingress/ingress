import { describe, it, expect } from 'vitest'
import 'reflect-metadata'
import { ModuleContainer, InjectionToken, ContextToken } from './di.js'

describe('container', () => {
  it('findProvidedSingleton', () => {
    class A {}
    class B {}
    const container = new ModuleContainer(),
      singleton = {},
      token = new InjectionToken('singleton'),
      a = new A()

    container.registerSingleton({ useValue: singleton, provide: token })
    container.registerSingleton({ useValue: a, provide: A })
    container.registerSingleton(B)
    expect(singleton).toBe(container.findProvidedSingleton(token))
    expect(a).toBe(container.findProvidedSingleton(A))
  })

  it('hostless, plain di', () => {
    const container = new ModuleContainer()
    class A {}
    class B {}
    container.registerSingleton(A)
    container.registerScoped(B)
    container.start()

    expect(() => container.registerScoped(A)).toThrow()
    expect(() => container.registerSingleton(B)).toThrow()
    const ctx = {},
      scoped = container.createChildWithContext(ctx)

    expect(() => container.get(B)).toThrow()

    expect(ctx).toBe(scoped.get(ContextToken))
    expect(scoped.get(A) instanceof A).toBe(true)
    expect(container.get(A) instanceof A).toBe(true)
    expect(scoped.get(A)).toBe(container.get(A))
    expect(scoped.get(B) instanceof B).toBe(true)
  })
})
