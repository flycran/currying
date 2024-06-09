# Currying

> Currying是一个极具创意的Node Server框架，它使用函数式编程和严格的类型安全编写服务端应用，正如它的名字一样，Currying大量使用了高阶函数和柯里化来进行类型安全的传递上下文，保证不会丢失任何静态类型。但这仅仅是Currying的核心理念，它还提供了许多前所未有的新概念和思想来编写服务端应用，它将彻底改变现有的开发Node Server的思想。

> 目前Currying仍处于开发阶段，但它的核心架构已经初见端倪，你可以使用类似如下的方式编写Currying App

```ts
const root = createRouter()

// 不带path的中间件
const r1 = root(() => {
  // 为下级路由提供额外信息
  return {
    date: Date.now(),
  }
})

r1.controller('/path-1', (ctx) => {
  // 在这里拿到父级路由提供的额外信息
  console.log('path-1 路由控制器被执行', ctx)
})

// 带path的中间件
const r2 = r1('/path-2')

r2.controller('/', (ctx) => {
  console.log('path-2 路由控制器被执行', ctx)
})

// 模拟请求
function rootExecute(context: Omit<Context, 'consumePath'>) {
  return root.execute({
    ...context,
    consumePath: context.path,
  })
}

rootExecute({
  path: '/a2',
})
```