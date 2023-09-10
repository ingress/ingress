/*eslint-disable @typescript-eslint/no-empty-function */
import 'reflect-metadata'
import { describe, it, expect } from 'vitest'
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
    expect(data.properties).toEqual(['one', 'onea'])
    expect(data.constructors).toEqual([One])
    expect(data.source).toBe(One)
  })

  it('should handle odd hierarchies?', () => {
    const data = reflectClassProperties(Three)
    expect(data.source).toBe(Three)
    expect(data.properties.sort()).toEqual(
      ['one', 'onea', 'three', 'threeb', 'two', 'twoa', 'twob'].sort(),
    )

    expect(data.constructors).toEqual([Three, Two, One])
  })

  it('should set annotations on the target method', () => {
    const metadata = getAnnotations(One.prototype, 'one')
    expect(metadata[0] instanceof MiddlewareFixture).toBeTruthy()
  })

  it('should set annotations on the target class', () => {
    const metadata = getAnnotations(One)
    expect(metadata[0] instanceof Fixture).toBeTruthy()
  })

  it('should expose the annotationInstance', () => {
    const instance = FixtureAnnotation().annotationInstance
    expect(instance instanceof Fixture).toBe(true)
  })
  it('should be detectable', () => {
    expect(isAnnotationFactory(FixtureAnnotation)).toBeTruthy()
    expect(isAnnotationFactory({})).toBeFalsy()
  })

  it('should return all annotations', () => {
    const classProperties = reflectAnnotations(One)
    expect(classProperties.length === 2).toBe(true)
    expect(classProperties[0].classAnnotations).toEqual(classProperties[1].classAnnotations)
    expect(classProperties[0].parent).toEqual(One)
    expect(classProperties[0].methodAnnotations.length === 3).toBe(true)
    expect(classProperties[1].methodAnnotations.length === 0).toBe(true)
  })

  it('should return method annotations in the declared order', () => {
    const classProperties = reflectAnnotations(One),
      methodOne = classProperties.find((x) => x.name === 'one')

    expect(methodOne?.methodAnnotations.map((x) => x.constructor.toString())).toEqual([
      Fixture.toString(),
      ExtraFixture.toString(),
      MiddlewareFixture.toString(),
    ])
  })

  it('should return method annotations in the parsed order', () => {
    const classProperties = reflectAnnotations(One, { declaredOrder: false }),
      methodOne = classProperties.find((x) => x.name === 'one')

    expect(methodOne?.methodAnnotations.map((x) => x.constructor.toString())).toEqual([
      MiddlewareFixture.toString(),
      ExtraFixture.toString(),
      Fixture.toString(),
    ])
  })

  it('should return class annotations in the declared order', () => {
    const classProperties = reflectAnnotations(One),
      annotations = classProperties[0].classAnnotations

    expect(annotations.map((x) => x.constructor.toString())).toEqual([
      MiddlewareFixture.toString(),
      ExtraFixture.toString(),
      Fixture.toString(),
    ])
  })

  it('should allow annotations with parameters', () => {
    const classProperties = reflectAnnotations(Four),
      annotations = classProperties[0].classAnnotations

    expect(annotations.map((x) => x.constructor.toString())).toEqual([
      ExtraFixtureWithParameter.toString(),
      ExtraFixtureWithLotsOfParameters.toString(),
    ])
    expect(annotations[0].options.a).toEqual(42)
  })

  it('should collect parameter annotations', () => {
    const classProperties = reflectAnnotations(Five)
    expect(classProperties[0].methodAnnotations.map((x) => x.constructor.toString())).toEqual([
      MiddlewareFixture.toString(),
    ])
    expect(classProperties[0].parameterAnnotations.map((x) => x.constructor.toString())).toEqual([
      Fixture.toString(),
    ])
    expect(
      classProperties[1].parameterAnnotations.map((x) => x && x.constructor.toString()),
    ).toEqual([MiddlewareFixture.toString(), undefined, Fixture.toString()])
  })

  it('should collect types', () => {
    const [annotatedMethod, unannotatedMethod] = reflectAnnotations(Six)
    expect(annotatedMethod.types.parameters).toEqual([String, Object, Number])
    //https://github.com/swc-project/swc/issues/3319
    //expect(annotatedMethod.types.return).toBe(String)

    expect(unannotatedMethod.types.parameters).toBeFalsy()
    expect(unannotatedMethod.types.return).toBeFalsy()
  })
})
