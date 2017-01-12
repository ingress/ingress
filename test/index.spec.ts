import 'reflect-metadata'
import * as assert from 'assert'
import { Container, Injector } from '../src'

import { ReflectiveInjector } from 'angular.di'

function injectable (target: any) {}
const Injectable = () => injectable

@Injectable()
class TestA {
  public a = Math.random()
}

@Injectable()
class TestB {
  constructor (public testA: TestA) {}
}

class Context { scope: Injector }

var container = new Container({
  contextToken: Context,
  providers: [TestA, TestB]
})

const { PerRequestLifetime, Singleton } = container

@PerRequestLifetime
class TestC {}

@PerRequestLifetime
class TestD {
  constructor (public testC: TestC, public testB: TestB ) {}
}


const context = new Context(),
  middleware = container.middleware

let called = false

function test () {
  called = true
  assert.ok(context.scope.get(Context) === context, 'Did not register Context as a per-request provider')

  const testA = context.scope.get(TestA),
    testB = context.scope.get(TestB),
    testC = context.scope.get(TestC),
    testD = context.scope.get(TestD)

  assert.ok(testA.a === testD.testB.testA.a, 'A does not appear to be a singleton')
  assert.ok(testD.testC === testC)
}

middleware(context, test)
assert.ok(called)
