interface Context {
  path: string
  consumePath: string
}

type Path = `/${ string }`

function matchPath(context: Context, path: string, accurate?: boolean) {
  if(path === context.consumePath)
    return {
      metch: true,
      consumePath: '',
    }

  if(accurate) {
    if(path === '/' && context.consumePath === '') {
      return {
        metch: true,
        consumePath: '',
      }
    }
  } else {
    if(path.startsWith(context.consumePath + '/')) {
      return {
        metch: true,
        consumePath: context.consumePath.slice(path.length),
      }
    }
  }

  return {
    metch: false,
    consumePath: context.consumePath,
  }
}

interface Result {
  response: any
  match: boolean
}

export function mergeContext<C1>(c1: C1): C1
export function mergeContext<C1, C2>(c1: C1, c2: C2): C1 & C2
export function mergeContext<C1, C2, C3>(c1: C1, c2: C2, c3: C3): C1 & C2 & C3
export function mergeContext<C1, C2, C3, C4>(c1: C1, c2: C2, c3: C3, c4: C4): C1 & C2 & C3 & C4
export function mergeContext<T extends object>(...ctxs: T[]): T
export function mergeContext(...ctxs: object[]) {
  return Object.assign(Object.create(null), ...ctxs)
}

type MayPromise<T> = T | Promise<T>

interface RouterDerive<CTX> {
  <CTX2 extends object | void>(
    this: Router<CTX>,
    middleware: (context: CTX) => CTX2 | void,
  ): Router<CTX2 extends object ? CTX & CTX2 : CTX>
}

export type InferContext<T> = T extends Router<infer CTX> ? CTX : never

interface RouterDeriveBind<CTX> {
  <CTX2 extends object | void>(middleware: (context: CTX) => CTX2 | void): Router<CTX2 extends object ? CTX & CTX2 : CTX>
}

interface RouterPrototype<CTX> {
  derive: RouterDerive<CTX>

  match(this: Router<CTX>, path: Path): Router<CTX>

  controller<R>(this: Router<CTX>, routerListener: (context: CTX) => MayPromise<R>): Router<CTX>

  execute(this: Router<CTX>, a: CTX): Promise<Result>
}

interface RouterInstance<CTX> {
  _routesListener?: (context: CTX) => any
  _matchList: { match: Path, router: Router<CTX> }[]
  _middleware?: (context: CTX) => object | void
  _middlewareList: Router[]
}

interface RouterBase<CTX> extends RouterPrototype<CTX>, RouterInstance<CTX> {
}

interface Router<CTX = Context> extends RouterBase<CTX>, RouterDeriveBind<CTX> {
}

const routerPrototype: Omit<Router, keyof RouterInstance<Context>> = {
  derive: function (middleware) {
    const router = createRouter()
    router._middleware = middleware
    this._middlewareList.push(router)
    return router
  } as RouterDerive<Context>,
  controller(routerListener) {
    if(this._routesListener) {
      throw new Error('You can only register one routing controller.')
    }
    this._routesListener = (context) => {
      return routerListener(context)
    }
    return this
  },
  match(path: Path) {
    const router = createRouter()
    this._matchList.push({
      match: path,
      router,
    })
    return router
  },
  async execute(context) {
    if(this._middleware) {
      const context2 = this._middleware(context)
      if(context2) {
        context = mergeContext(context, context2)
      }
    }
    const listener = this._routesListener
    if(listener) {
      const res = await listener({
        ...context,
        consumePath: '',
      })
      return {
        match: true,
        response: res,
      }
    }
    for(let i = 0; i < this._matchList.length; i++) {
      const item = this._matchList[i]
      const mp = matchPath(context, item.match)
      if(mp.metch) {
        const res = await item.router.execute(context)
        if(res.match) {
          return res
        }
      }
    }
    for(let i = 0; i < this._middlewareList.length; i++) {
      const item = this._middlewareList[i]
      const res = await item.execute(context)
      if(res.match) {
        return res
      }
    }
    return {
      response: null,
      match: false,
    }
  },
}

const createRouter = <CXT extends Context = Context>(): Router<CXT> => {
  const cr = function () {
  } as unknown as RouterBase<CXT>
  Object.setPrototypeOf(cr, routerPrototype)
  cr._matchList = []
  cr._middlewareList = []
  const proxy: any = new Proxy(cr, {
    apply(_: any, __: any, argArray: any) {
      return routerPrototype.derive.apply(proxy, argArray)
    },
  })
  return proxy as Router<CXT>
}

const root = createRouter()

const r1 = root(() => {
  return {
    p: 2,
  }
})

// r1.addRoute('/a1', (p) => {
//   console.log('/a1', p)
// })

const r4 = r1.match('/a2')

r4.match('/').controller((p) => {
  console.log('/a2', p)
})

const r5 = createRouter<InferContext<typeof r4>>()

function rootExecute(context: Omit<Context, 'consumePath'>) {
  return root.execute({
    ...context,
    consumePath: context.path,
  })
}

rootExecute({
  path: '/a2',
}).then(res => {
  console.log(res)
})

const service = async (context: {}) => {
  // 获取实参
  console.log(context)
}

const controller = async (context: {}) => {
  service(context)
  // 不使用实参
  // service()
}

controller({a: 1})
controller({b: 2})
