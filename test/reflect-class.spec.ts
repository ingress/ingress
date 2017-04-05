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

const FixtureAnnotation = createAnnotationFactory(Fixture)
const MiddlewareAnnotation = createAnnotationFactory(MiddlewareFixture)
const ExtraAnnotation = createAnnotationFactory(ExtraFixture)

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

    it('should return class annotations in the declared order', () => {
      const classProperties = reflectAnnotations(One)
      const annotations = classProperties[0].classAnnotations

      expect(annotations.map(x => x.constructor.toString())).to.eql([
        MiddlewareFixture.toString(),
        ExtraFixture.toString(),
        Fixture.toString()
      ])
    })
  })
})
