interface Context {
  path: string
  consumePath: string
}

type Path = `/${string}`

function matchPath(context: Context, path: string, accurate?: boolean) {
  if (path === context.consumePath)
    return {
      metch: true,
      consumePath: '',
    }

  if (accurate) {
    if (path === '/' && context.consumePath === '') {
      return {
        metch: true,
        consumePath: '',
      }
    }
  } else {
    if (path.startsWith(context.consumePath + '/')) {
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

type MayPromise<T> = T | Promise<T>

interface RouterDerive<CTX> {
  (this: Router<CTX>, path: Path): Router<CTX>

  <CTX2 extends object | void>(
    this: Router<CTX>,
    path: `/${string}`,
    a: (p: CTX) => CTX2 | void,
  ): Router<CTX2 extends object ? CTX & CTX2 : CTX>

  <CTX2 extends object | void>(
    this: Router<CTX>,
    a: (p: CTX) => CTX2 | void,
  ): Router<CTX2 extends object ? CTX & CTX2 : CTX>
}

interface RouterDeriveBind<CTX> {
  (path: Path): Router<CTX>

  <CTX2 extends object | void>(
    path: `/${string}`,
    a: (p: CTX) => CTX2 | void,
  ): Router<CTX2 extends object ? CTX & CTX2 : CTX>

  <CTX2 extends object | void>(a: (p: CTX) => CTX2 | void): Router<CTX2 extends object ? CTX & CTX2 : CTX>
}

interface RouterPrototype<CTX> {
  derive: RouterDerive<CTX>

  controller<R>(this: Router<CTX>, path: Path, routerListener: (context: CTX) => MayPromise<R>): Router<CTX>

  execute(this: Router<CTX>, a: CTX): Promise<Result>
}

interface RouterInstance<CTX> {
  routesListener: Map<string, (context: CTX) => any>
  pathMiddlewareListener: Map<string, (context: CTX) => Promise<Result>>
  middlewareListener: Set<(context: CTX) => Promise<Result>>
}

interface RouterBase<CTX> extends RouterPrototype<CTX>, RouterInstance<CTX> {}

interface Router<CTX> extends RouterBase<CTX>, RouterDeriveBind<CTX> {}

const routerPrototype: Omit<Router<Context>, keyof RouterInstance<Context>> = {
  derive: function (p1: any, p2: any) {
    const rls = typeof p1 === 'function' ? p1 : p2
    const cr2 = createRouter()

    const routerListener = rls
      ? async (context: Context) => {
          const context2 = rls(Object.freeze(context))
          const context3 = context2 ? Object.assign({}, context, context2) : context
          return cr2.execute(context3)
        }
      : async (context: Context) => cr2.execute(context)
    if (typeof p1 === 'string') {
      this.pathMiddlewareListener.set(p1, routerListener)
    } else {
      this.middlewareListener.add(routerListener)
    }
    return cr2
  } as Router<Context>['derive'],
  controller(path, routerListener) {
    this.routesListener.set(path, (context) => {
      return routerListener(Object.freeze(context))
    })
    return this
  },
  async execute(context) {
    for (const [path, listener] of this.routesListener) {
      const mp = matchPath(context, path, true)
      if (mp.metch) {
        const res = await listener({
          ...context,
          consumePath: '',
        })
        return {
          match: true,
          response: res,
        }
      }
    }
    for (const [path, listener] of this.pathMiddlewareListener) {
      const mp = matchPath(context, path)
      if (mp.metch) {
        const res = await listener({
          ...context,
          consumePath: mp.consumePath,
        })
        if (res.match) {
          return res
        }
      }
    }
    for (const ml of this.middlewareListener) {
      const res = await ml(context)
      if (res.match) {
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
  const cr = function () {} as unknown as RouterBase<CXT>
  Object.setPrototypeOf(cr, routerPrototype)
  cr.routesListener = new Map()
  cr.pathMiddlewareListener = new Map()
  cr.middlewareListener = new Set()
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

const r4 = r1('/a2')

r4.controller('/', (p) => {
  console.log('/a2', p)
})

function rootExecute(context: Omit<Context, 'consumePath'>) {
  return root.execute({
    ...context,
    consumePath: context.path,
  })
}

rootExecute({
  path: '/a2',
})
