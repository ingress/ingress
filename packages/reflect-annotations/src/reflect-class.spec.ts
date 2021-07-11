/*eslint-disable @typescript-eslint/no-empty-function */
import 'reflect-metadata'
import t from 'tap'
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
  towa() {}
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
    @FixtureAnnotation() _param2: any
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

t.test('reflect-annotations', (t) => {
  t.test('reflectClassProperties', (t) => {
    t.test('should reflect on a class', (t) => {
      const data = reflectClassProperties(One)
      t.same(data.properties, ['one', 'onea'])
      t.same(data.constructors, [One])
      t.same(data.source, One)
      t.end()
    })

    t.test('should handle odd hierarchies?', (t) => {
      const data = reflectClassProperties(Three)
      t.same(data.source, Three)
      t.same(
        data.properties.sort(),
        ['three', 'threeb', 'two', 'towa', 'twob', 'one', 'onea'].sort()
      )
      t.same(data.constructors, [Three, Two, One])
      t.end()
    })
    t.end()
  })

  t.test('createAnnotationFactory', (t) => {
    t.test('should set annotations on the target method', (t) => {
      const metadata = getAnnotations(One.prototype, 'one')
      t.ok(metadata[0] instanceof MiddlewareFixture)
      t.end()
    })

    t.test('should set annotations on the target class', (t) => {
      const metadata = getAnnotations(One)
      t.ok(metadata[0] instanceof Fixture)
      t.end()
    })
    t.end()
  })

  t.test('createAnnotationFactory', (t) => {
    t.test('should expose the annotationInstance', (t) => {
      const instance = FixtureAnnotation().annotationInstance
      t.ok(instance instanceof Fixture)
      t.end()
    })
    t.test('should be detectable', (t) => {
      t.ok(isAnnotationFactory(FixtureAnnotation))
      t.notOk(isAnnotationFactory({}))
      t.end()
    })
    t.end()
  })

  t.test('reflectAnnotations', (t) => {
    t.test('should return all annotations', (t) => {
      const classProperties = reflectAnnotations(One)
      t.ok(classProperties.length === 2)
      t.same(classProperties[0].classAnnotations, classProperties[1].classAnnotations)
      t.equal(classProperties[0].parent, One)
      t.ok(classProperties[0].methodAnnotations.length === 3)
      t.ok(classProperties[1].methodAnnotations.length === 0)
      t.end()
    })

    t.test('should return method annotations in the declared order', (t) => {
      const classProperties = reflectAnnotations(One),
        methodOne = classProperties.find((x) => x.name === 'one')

      t.same(
        methodOne?.methodAnnotations.map((x) => x.constructor.toString()),
        [Fixture.toString(), ExtraFixture.toString(), MiddlewareFixture.toString()]
      )
      t.end()
    })

    t.test('should return method annotations in the parsed order', (t) => {
      const classProperties = reflectAnnotations(One, { declaredOrder: false }),
        methodOne = classProperties.find((x) => x.name === 'one')

      t.same(
        methodOne?.methodAnnotations.map((x) => x.constructor.toString()),
        [MiddlewareFixture.toString(), ExtraFixture.toString(), Fixture.toString()]
      )
      t.end()
    })

    t.test('should return class annotations in the declared order', (t) => {
      const classProperties = reflectAnnotations(One),
        annotations = classProperties[0].classAnnotations

      t.same(
        annotations.map((x) => x.constructor.toString()),
        [MiddlewareFixture.toString(), ExtraFixture.toString(), Fixture.toString()]
      )
      t.end()
    })

    t.test('should allow annotations with parameters', (t) => {
      const classProperties = reflectAnnotations(Four),
        annotations = classProperties[0].classAnnotations

      t.same(
        annotations.map((x) => x.constructor.toString()),
        [ExtraFixtureWithParameter.toString(), ExtraFixtureWithLotsOfParameters.toString()]
      )
      t.equal(annotations[0].options.a, 42)
      t.end()
    })

    t.test('should collect parameter annotations', (t) => {
      const classProperties = reflectAnnotations(Five)
      t.same(
        classProperties[0].methodAnnotations.map((x) => x.constructor.toString()),
        [MiddlewareFixture.toString()]
      )
      t.same(
        classProperties[0].parameterAnnotations.map((x) => x.constructor.toString()),
        [Fixture.toString()]
      )
      t.same(
        classProperties[1].parameterAnnotations.map((x) => x && x.constructor.toString()),
        [MiddlewareFixture.toString(), undefined, Fixture.toString()]
      )
      t.end()
    })
    t.end()
  })

  t.test('should collect types', (t) => {
    const [annotatedMethod, unannotatedMethod] = reflectAnnotations(Six)
    t.same(annotatedMethod.types.parameters, [String, Object, Number])
    t.equal(annotatedMethod.types.return, String)

    t.notOk(unannotatedMethod.types.parameters)
    t.notOk(unannotatedMethod.types.return)
    t.end()
  })

  t.end()
})
