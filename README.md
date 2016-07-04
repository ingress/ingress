## reflect-annotations

Annotations are namespaced [metadata](https://www.npmjs.com/package/reflect-metadata) fields used for defining non-destructive runtime metadata on classes and methods.

### Example
```javascript
import { createAnnotationFactory, reflectAnnotations } from 'reflect-annotations'

function ExampleAnnotation (name, size) {
  this.name = name
  this.size = size
}

const Example = createAnnotationFactory(ExampleAnnotation)

class MyClass {
  @Example('test', 42)
  method() {
    //do something
  }
}
console.log(reflectAnnotations(MyClass))
//[{
//  name: 'method',
//  classAnnotations: [],
//  methodAnnotations: [ ExampleAnnotation {} ]
//}]
```

In the above example a decorator is created when `Example` is invoked at parse time. The decorator adds an `ExampleAnnotation` _instance_ to the target's list of annotations. The decorator is non-destructive, meaning it doesn't alter the property descriptor or target. It only appends annotation metadata.

### Requirements
- [reflect-metadata](https://www.npmjs.com/package/reflect-metadata) polyfill
- TypeScript OR this [Babel plugin](https://www.npmjs.com/package/babel-plugin-transform-decorators-legacy)
