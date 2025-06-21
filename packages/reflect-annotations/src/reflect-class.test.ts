import 'reflect-metadata'
import { describe, it } from 'node:test'
import assert from 'node:assert'
import { reflectClassProperties } from './reflect-class.js'
import { createAnnotationFactory, getAnnotations } from './annotations.js'
import { reflectAnnotations, isAnnotationFactory } from './index.js'

class MiddlewareFixture {
  middleware(ctx: any, next: (...args: any[]) => any) {
    ctx.fixture = true
    return next()
  }
}
class Fixture {
  cascade = true
}
class ExtraFixture {}

class ExtraFixtureWithParameter {
  constructor(public options: { a: number }) {}
}

class ExtraFixtureWithLotsOfParameters {
  constructor(a1: 1, a2: 2, a3: 3, a4: 4, a5: 5, a6: 6, a7: 7, a8: 8, a9: 9, a10: 10, a11: 11) {
    void a11
  }
}

const FixtureAnnotation = createAnnotationFactory(Fixture),
  MiddlewareAnnotation = createAnnotationFactory(MiddlewareFixture),
  ExtraAnnotation = createAnnotationFactory(ExtraFixture),
  ExtraAnnotationWithAParameter = createAnnotationFactory(ExtraFixtureWithParameter),
  ExtraAnnotationWithALotsOfParameters = createAnnotationFactory(ExtraFixtureWithLotsOfParameters)

@MiddlewareAnnotation()
@ExtraAnnotation()
@FixtureAnnotation()
class One {
  @FixtureAnnotation()
  @ExtraAnnotation()
  @MiddlewareAnnotation()
  one() {}
  onea() {}
}

class Two extends One {
  two() {}
  twoa() {}
  @FixtureAnnotation()
  twob() {}
}

class Three extends Two {
  three() {}
  threeb() {}
}

@ExtraAnnotationWithAParameter({ a: 42 })
@ExtraAnnotationWithALotsOfParameters(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
class Four {
  asdf() {}
}

class Five {
  @MiddlewareAnnotation()
  methodWithAParameter(@FixtureAnnotation() _param: any) {}

  anotherMethodWithAParameter(
    @MiddlewareAnnotation() _param: any,
    _noAnnotation: any,
    @FixtureAnnotation() _param2: any,
  ) {}
}

class Six {
  @MiddlewareAnnotation()
  methodWithTypes(@FixtureAnnotation() _param: string, _foo: any, _otherParam: number): string {
    return 'hello'
  }
  methodWithNoAnnotations(_param: string, _foo: any, _otherParam: number): string {
    return 'hello'
  }
}

describe('reflect-annotations', () => {
  it('should reflect on a class', () => {
    const data = reflectClassProperties(One)
    assert.deepStrictEqual(data.properties, ['one', 'onea'])
    assert.deepStrictEqual(data.constructors, [One])
    assert.strictEqual(data.source, One)
  })

  it('should handle odd hierarchies?', () => {
    const data = reflectClassProperties(Three)
    assert.strictEqual(data.source, Three)
    assert.deepStrictEqual(
      data.properties.sort(),
      ['one', 'onea', 'three', 'threeb', 'two', 'twoa', 'twob'].sort(),
    )

    assert.deepStrictEqual(data.constructors, [Three, Two, One])
  })

  it('should set annotations on the target method', () => {
    const metadata = getAnnotations(One.prototype, 'one')
    assert.ok(metadata[0] instanceof MiddlewareFixture)
  })

  it('should set annotations on the target class', () => {
    const metadata = getAnnotations(One)
    assert.ok(metadata[0] instanceof Fixture)
  })

  it('should expose the annotationInstance', () => {
    const instance = FixtureAnnotation().annotationInstance
    assert.strictEqual(instance instanceof Fixture, true)
  })
  it('should be detectable', () => {
    assert.ok(isAnnotationFactory(FixtureAnnotation))
    assert.ok(!isAnnotationFactory({}))
  })

  it('should return all annotations', () => {
    const classProperties = reflectAnnotations(One)
    assert.strictEqual(classProperties.length === 2, true)
    assert.deepStrictEqual(classProperties[0].classAnnotations, classProperties[1].classAnnotations)
    assert.deepStrictEqual(classProperties[0].parent, One)
    assert.strictEqual(classProperties[0].methodAnnotations.length === 3, true)
    assert.strictEqual(classProperties[1].methodAnnotations.length === 0, true)
  })

  it('should return method annotations in the declared order', () => {
    const classProperties = reflectAnnotations(One),
      methodOne = classProperties.find((x) => x.name === 'one')

    assert.deepStrictEqual(
      methodOne?.methodAnnotations.map((x) => x.constructor.toString()),
      [Fixture.toString(), ExtraFixture.toString(), MiddlewareFixture.toString()],
    )
  })

  it('should return method annotations in the parsed order', () => {
    const classProperties = reflectAnnotations(One, { declaredOrder: false }),
      methodOne = classProperties.find((x) => x.name === 'one')

    assert.deepStrictEqual(
      methodOne?.methodAnnotations.map((x) => x.constructor.toString()),
      [MiddlewareFixture.toString(), ExtraFixture.toString(), Fixture.toString()],
    )
  })

  it('should return class annotations in the declared order', () => {
    const classProperties = reflectAnnotations(One),
      annotations = classProperties[0].classAnnotations

    assert.deepStrictEqual(
      annotations.map((x) => x.constructor.toString()),
      [MiddlewareFixture.toString(), ExtraFixture.toString(), Fixture.toString()],
    )
  })

  it('should allow annotations with parameters', () => {
    const classProperties = reflectAnnotations(Four),
      annotations = classProperties[0].classAnnotations

    assert.deepStrictEqual(
      annotations.map((x) => x.constructor.toString()),
      [ExtraFixtureWithParameter.toString(), ExtraFixtureWithLotsOfParameters.toString()],
    )
    assert.strictEqual(annotations[0].options.a, 42)
  })

  it('should collect parameter annotations', () => {
    const classProperties = reflectAnnotations(Five)
    assert.deepStrictEqual(
      classProperties[0].methodAnnotations.map((x) => x.constructor.toString()),
      [MiddlewareFixture.toString()],
    )
    assert.deepStrictEqual(
      classProperties[0].parameterAnnotations.map((x) => x.constructor.toString()),
      [Fixture.toString()],
    )
    assert.deepStrictEqual(
      classProperties[1].parameterAnnotations.map((x) => x && x.constructor.toString()),
      [MiddlewareFixture.toString(), undefined, Fixture.toString()],
    )
  })

  it('should collect types', () => {
    const [annotatedMethod, unannotatedMethod] = reflectAnnotations(Six)
    assert.deepStrictEqual(annotatedMethod.types.parameters, [String, Object, Number])
    assert.strictEqual(annotatedMethod.types.return, String)

    assert.ok(!unannotatedMethod.types.parameters)
    assert.ok(!unannotatedMethod.types.return)
  })
})
