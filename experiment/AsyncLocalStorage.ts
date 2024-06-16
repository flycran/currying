import { AsyncLocalStorage } from 'node:async_hooks'

const asyncLocalStorage = new AsyncLocalStorage<any>()

const waitTime = (time: number) => new Promise((resolve) => {
  setTimeout(() => {
    resolve(time)
  }, time)
})

const start = (ctx: object) => {
  return asyncLocalStorage.run(ctx, async () => {
    const context = asyncLocalStorage.getStore()
    console.log(context)
    if(context.a) context.a++
    if(context.b) context.b--
    await waitTime(100)
    await a1()
  })
}

const a1 = async () => {
  console.log(asyncLocalStorage.getStore())
}

start({ a: 1 })
start({ b: 1 })