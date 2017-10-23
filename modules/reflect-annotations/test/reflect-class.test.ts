import { reflectClassProperties } from '../src/reflect-class'
import { createAnnotationFactory, getAnnotations } from '../src/annotations'
import { reflectAnnotations } from '../src/index'
import { expect } from 'chai'

class MiddlewareFixture {
  middleware (ctx: any, next: Function) {
    ctx.fixture = true
    return next()
  }
}
class Fixture {
  cascade: boolean = true
}
class ExtraFixture {}

class ExtraFixtureWithParameter {
  constructor (public options: { a: number }) {}
}

class ExtraFixtureWithLotsOfParameters {
  constructor (a1: 1, a2: 2, a3: 3, a4: 4, a5: 5, a6: 6, a7: 7, a8: 8, a9: 9, a10: 10, a11: 11) {}
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
  one () {}
  onea(){}
}

class Two extends One {
  two() {}
  towa() {}
  @FixtureAnnotation()
  twob() {}
}

class Three extends Two {
  three () {}
  threeb() {}
}

@ExtraAnnotationWithAParameter({ a: 42 })
@ExtraAnnotationWithALotsOfParameters(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
class Four {
  asdf() {}
}

class Five {
  @MiddlewareAnnotation()
  methodWithAParameter(@FixtureAnnotation() param: any) {

  }

  anotherMethodWithAParameter(@MiddlewareAnnotation() param: any, noAnnotation: any, @FixtureAnnotation() param2: any) {

  }
}

class Six {
  @MiddlewareAnnotation()
  methodWithTypes(@FixtureAnnotation() param: string, foo: any, otherParam: number): string { return 'hello' }

  methodWithNoAnnotations(param: string, foo: any, otherParam: number): string { return 'hello' }
}

describe('reflect-annotations', () => {
  describe('reflectClassProperties', () => {
    it('should reflect on a class', () => {
      const data = reflectClassProperties(One)
      expect(data.properties).to.eql(['one', 'onea'])
      expect(data.constructors).to.eql([One])
      expect(data.source).to.equal(One)
    })

    it('should handle odd hierarchies?', () => {
      const data = reflectClassProperties(Three)
      expect(data.source).to.equal(Three)
      expect(data.properties.sort()).to.eql(['three', 'threeb' , 'two', 'towa', 'twob', 'one', 'onea'].sort())
      expect(data.constructors).to.eql([Three, Two, One])
    })
  })

  describe('createAnnotationFactory', () => {
    it('should set annotations on the target method', () => {
      const metadata = getAnnotations(One.prototype, 'one')
      expect(metadata[0]).to.be.an.instanceof(MiddlewareFixture)
    })

    it('should set annotations on the target class', () => {
      const metadata = getAnnotations(One)
      expect(metadata[0]).to.be.an.instanceof(Fixture)
    })
  })

  describe('reflectAnnotations', () => {
    it('should return all annotations', () => {
      const classProperties = reflectAnnotations(One)
      expect(classProperties).to.have.length(2)
      expect(classProperties[0].classAnnotations).to.eql(classProperties[1].classAnnotations)
      expect(classProperties[0].methodAnnotations).to.have.length(3)
      expect(classProperties[1].methodAnnotations).to.have.length(0)
    })

    it('should return method annotations in the declared order', () => {
      const classProperties = reflectAnnotations(One)
      const methodOne = classProperties.find(x => x.name === 'one')

      expect(methodOne.methodAnnotations.map(x => x.constructor.toString())).to.eql([
        Fixture.toString(),
        ExtraFixture.toString(),
        MiddlewareFixture.toString()
      ])
    })

    it('should return method annotations in the parsed order', () => {
      const classProperties = reflectAnnotations(One, { declaredOrder: false })
      const methodOne = classProperties.find(x => x.name === 'one')

      expect(methodOne.methodAnnotations.map(x => x.constructor.toString())).to.eql([
        MiddlewareFixture.toString(),
        ExtraFixture.toString(),
        Fixture.toString()
      ])
    })

    it('should return class annotations in the declared order', () => {
      const classProperties = reflectAnnotations(One)
      const annotations = classProperties[0].classAnnotations

      expect(annotations.map(x => x.constructor.toString())).to.eql([
        MiddlewareFixture.toString(),
        ExtraFixture.toString(),
        Fixture.toString()
      ])
    })

    it('should allow annotations with parameters', () => {
      const classProperties = reflectAnnotations(Four)
      const annotations = classProperties[0].classAnnotations

      expect(annotations.map(x => x.constructor.toString())).to.eql([
        ExtraFixtureWithParameter.toString(),
        ExtraFixtureWithLotsOfParameters.toString()
      ])
      expect(annotations[0].options.a).to.eql(42)
    })

    it('should collect parameter annotions', () => {
      const classProperties = reflectAnnotations(Five)
      expect(classProperties[0].methodAnnotations.map(x => x.constructor.toString())).to.eql([
        MiddlewareFixture.toString()
      ])
      expect(classProperties[0].parameterAnnotations.map(x => x.constructor.toString())).to.eql([
        Fixture.toString()
      ])
      expect(classProperties[1].parameterAnnotations.map(x => x && x.constructor.toString())).to.eql([
        MiddlewareFixture.toString(),
        undefined,
        Fixture.toString()
      ])
    })
  })

  it('should collect types', () => {
    const [annotatedMethod, unannotatedMethod] = reflectAnnotations(Six)
    expect(annotatedMethod.types.parameters).to.eql([String, Object, Number])
    expect(annotatedMethod.types.return).to.eql(String)

    expect(unannotatedMethod.types.parameters).to.be.undefined
    expect(unannotatedMethod.types.return).to.be.undefined
  })
})
