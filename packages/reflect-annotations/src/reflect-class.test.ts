/*eslint-disable @typescript-eslint/no-empty-function */
import 'reflect-metadata'
import * as t from 'uvu/assert'
import { test } from 'uvu'
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

test('should reflect on a class', () => {
  const data = reflectClassProperties(One)
  t.equal(data.properties, ['one', 'onea'])
  t.equal(data.constructors, [One])
  t.is(data.source, One)
})

test('should handle odd hierarchies?', () => {
  const data = reflectClassProperties(Three)
  t.is(data.source, Three)
  t.equal(data.properties.sort(), ['three', 'threeb', 'two', 'towa', 'twob', 'one', 'onea'].sort())
  t.equal(data.constructors, [Three, Two, One])
})

test('should set annotations on the target method', () => {
  const metadata = getAnnotations(One.prototype, 'one')
  t.ok(metadata[0] instanceof MiddlewareFixture)
})

test('should set annotations on the target class', () => {
  const metadata = getAnnotations(One)
  t.ok(metadata[0] instanceof Fixture)
})

test('should expose the annotationInstance', () => {
  const instance = FixtureAnnotation().annotationInstance
  t.ok(instance instanceof Fixture)
})
test('should be detectable', () => {
  t.ok(isAnnotationFactory(FixtureAnnotation))
  t.not.ok(isAnnotationFactory({}))
})

test('should return all annotations', () => {
  const classProperties = reflectAnnotations(One)
  t.ok(classProperties.length === 2)
  t.equal(classProperties[0].classAnnotations, classProperties[1].classAnnotations)
  t.equal(classProperties[0].parent, One)
  t.ok(classProperties[0].methodAnnotations.length === 3)
  t.ok(classProperties[1].methodAnnotations.length === 0)
})

test('should return method annotations in the declared order', () => {
  const classProperties = reflectAnnotations(One),
    methodOne = classProperties.find((x) => x.name === 'one')

  t.equal(
    methodOne?.methodAnnotations.map((x) => x.constructor.toString()),
    [Fixture.toString(), ExtraFixture.toString(), MiddlewareFixture.toString()]
  )
})

test('should return method annotations in the parsed order', () => {
  const classProperties = reflectAnnotations(One, { declaredOrder: false }),
    methodOne = classProperties.find((x) => x.name === 'one')

  t.equal(
    methodOne?.methodAnnotations.map((x) => x.constructor.toString()),
    [MiddlewareFixture.toString(), ExtraFixture.toString(), Fixture.toString()]
  )
})

test('should return class annotations in the declared order', () => {
  const classProperties = reflectAnnotations(One),
    annotations = classProperties[0].classAnnotations

  t.equal(
    annotations.map((x) => x.constructor.toString()),
    [MiddlewareFixture.toString(), ExtraFixture.toString(), Fixture.toString()]
  )
})

test('should allow annotations with parameters', () => {
  const classProperties = reflectAnnotations(Four),
    annotations = classProperties[0].classAnnotations

  t.equal(
    annotations.map((x) => x.constructor.toString()),
    [ExtraFixtureWithParameter.toString(), ExtraFixtureWithLotsOfParameters.toString()]
  )
  t.equal(annotations[0].options.a, 42)
})

test('should collect parameter annotations', () => {
  const classProperties = reflectAnnotations(Five)
  t.equal(
    classProperties[0].methodAnnotations.map((x) => x.constructor.toString()),
    [MiddlewareFixture.toString()]
  )
  t.equal(
    classProperties[0].parameterAnnotations.map((x) => x.constructor.toString()),
    [Fixture.toString()]
  )
  t.equal(
    classProperties[1].parameterAnnotations.map((x) => x && x.constructor.toString()),
    [MiddlewareFixture.toString(), undefined, Fixture.toString()]
  )
})

test('should collect types', () => {
  const [annotatedMethod, unannotatedMethod] = reflectAnnotations(Six)
  t.equal(annotatedMethod.types.parameters, [String, Object, Number])
  t.is(annotatedMethod.types.return, String)

  t.not.ok(unannotatedMethod.types.parameters)
  t.not.ok(unannotatedMethod.types.return)
})

test.run()
