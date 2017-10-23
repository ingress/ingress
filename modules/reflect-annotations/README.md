## reflect-annotations

Annotations are namespaced [metadata](https://www.npmjs.com/package/reflect-metadata) fields used for defining non-destructive runtime metadata on classes, methods and parameters.

### Example
```javascript
import { createAnnotationFactory, reflectAnnotations } from 'reflect-annotations'

function ExampleAnnotation (name, size) {
  this.name = name
  this.size = size
}
function ExampleAnnotation2 (name, size) {
  this.name = name
  this.size = size
}

const Example = createAnnotationFactory(ExampleAnnotation)
const Example2 = createAnnotationFactory(ExampleAnnotation2)

class MyClass {
  @Example('test', 42)
  @Example2('test', 42)
  method(@Example() a, b, @Example2() c) {
    //do something
  }
}
console.log(reflectAnnotations(MyClass))
//[{
//  name: 'method',
//  declaredOrder: true,
//  classAnnotations: [],
//  methodAnnotations: [ ExampleAnnotation {}, ExampleAnnotation2 {} ],
//  parameterAnnotations: [ ExampleAnnotation {}, undefined, ExampleAnnotation2 {} ]
//}]
console.log(reflectAnnotations(MyClass, { declaredOrder: false }))
//[{
//  name: 'method',
//  declaredOrder: false,
//  classAnnotations: [],
//  methodAnnotations: [ ExampleAnnotation2 {}, ExampleAnnotation {} ],
//  parameterAnnotations: [ ExampleAnnotation {}, undefined, ExampleAnnotation2 {} ]
//}]
```

In the above example a decorator is created when `Example` is invoked at parse time. The decorator adds an `ExampleAnnotation` _instance_ to the target's list of annotations. These "Annotations" are non destructive metadata.

By default annotations are processed in "declared order" this is the order that they're declared (top to bottom) The opposite of this order would be "parsed order" which is the order that the javascript engine executes them.

The order they're recorded in can be adjusted by passing the `{ declaredOrder: false }` as a second optional options argument.

### Requirements
- [reflect-metadata](https://www.npmjs.com/package/reflect-metadata) polyfill
- TypeScript OR this [Babel plugin](https://www.npmjs.com/package/babel-plugin-transform-decorators-legacy)
