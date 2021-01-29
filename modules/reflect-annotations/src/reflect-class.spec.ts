import { reflectClassProperties } from './reflect-class'
import { createAnnotationFactory, getAnnotations } from './annotations'
import { reflectAnnotations, isAnnotationFactory } from './index'

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
  constructor(a1: 1, a2: 2, a3: 3, a4: 4, a5: 5, a6: 6, a7: 7, a8: 8, a9: 9, a10: 10, a11: 11) {}
}

const FixtureAnnotation = createAnnotationFactory(Fixture)
const MiddlewareAnnotation = createAnnotationFactory(MiddlewareFixture)
const ExtraAnnotation = createAnnotationFactory(ExtraFixture)
const ExtraAnnotationWithAParameter = createAnnotationFactory(ExtraFixtureWithParameter)
const ExtraAnnotationWithALotsOfParameters = createAnnotationFactory(ExtraFixtureWithLotsOfParameters)

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
  methodWithTypes(@FixtureAnnotation() param: string, foo: any, otherParam: number): string {
    return 'hello'
  }
  methodWithNoAnnotations(param: string, foo: any, otherParam: number): string {
    return 'hello'
  }
}

describe('reflect-annotations', () => {
  describe('reflectClassProperties', () => {
    it('should reflect on a class', () => {
      const data = reflectClassProperties(One)
      expect(data.properties).toEqual(['one', 'onea'])
      expect(data.constructors).toEqual([One])
      expect(data.source).toEqual(One)
    })

    it('should handle odd hierarchies?', () => {
      const data = reflectClassProperties(Three)
      expect(data.source).toEqual(Three)
      expect(data.properties.sort()).toEqual(['three', 'threeb', 'two', 'towa', 'twob', 'one', 'onea'].sort())
      expect(data.constructors).toEqual([Three, Two, One])
    })
  })

  describe('createAnnotationFactory', () => {
    it('should set annotations on the target method', () => {
      const metadata = getAnnotations(One.prototype, 'one')
      expect(metadata[0]).toBeInstanceOf(MiddlewareFixture)
    })

    it('should set annotations on the target class', () => {
      const metadata = getAnnotations(One)
      expect(metadata[0]).toBeInstanceOf(Fixture)
    })
  })

  describe('createAnnotationFactory', () => {
    it('should expose the annotationInstance', () => {
      const instance = FixtureAnnotation().annotationInstance
      expect(instance).toBeInstanceOf(Fixture)
    })
    it('should be detectable', () => {
      expect(isAnnotationFactory(FixtureAnnotation)).toEqual(true)
      expect(isAnnotationFactory({})).toEqual(false)
    })
  })

  describe('reflectAnnotations', () => {
    it('should return all annotations', () => {
      const classProperties = reflectAnnotations(One)
      expect(classProperties).toHaveLength(2)
      expect(classProperties[0].classAnnotations).toEqual(classProperties[1].classAnnotations)
      expect(classProperties[0].methodAnnotations).toHaveLength(3)
      expect(classProperties[1].methodAnnotations).toHaveLength(0)
    })

    it('should return method annotations in the declared order', () => {
      const classProperties = reflectAnnotations(One)
      const methodOne = classProperties.find((x) => x.name === 'one')

      expect(methodOne?.methodAnnotations.map((x) => x.constructor.toString())).toEqual([
        Fixture.toString(),
        ExtraFixture.toString(),
        MiddlewareFixture.toString(),
      ])
    })

    it('should return method annotations in the parsed order', () => {
      const classProperties = reflectAnnotations(One, { declaredOrder: false })
      const methodOne = classProperties.find((x) => x.name === 'one')

      expect(methodOne?.methodAnnotations.map((x) => x.constructor.toString())).toEqual([
        MiddlewareFixture.toString(),
        ExtraFixture.toString(),
        Fixture.toString(),
      ])
    })

    it('should return class annotations in the declared order', () => {
      const classProperties = reflectAnnotations(One)
      const annotations = classProperties[0].classAnnotations

      expect(annotations.map((x) => x.constructor.toString())).toEqual([
        MiddlewareFixture.toString(),
        ExtraFixture.toString(),
        Fixture.toString(),
      ])
    })

    it('should allow annotations with parameters', () => {
      const classProperties = reflectAnnotations(Four)
      const annotations = classProperties[0].classAnnotations

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
      expect(classProperties[0].parameterAnnotations.map((x) => x.constructor.toString())).toEqual([Fixture.toString()])
      expect(classProperties[1].parameterAnnotations.map((x) => x && x.constructor.toString())).toEqual([
        MiddlewareFixture.toString(),
        undefined,
        Fixture.toString(),
      ])
    })
  })

  it('should collect types', () => {
    const [annotatedMethod, unannotatedMethod] = reflectAnnotations(Six)
    expect(annotatedMethod.types.parameters).toEqual([String, Object, Number])
    expect(annotatedMethod.types.return).toEqual(String)

    expect(unannotatedMethod.types.parameters).toBeUndefined()
    expect(unannotatedMethod.types.return).toBeUndefined()
  })
})
