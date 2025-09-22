export const info = {
  name: 'noxt-plugin',
  description: 'Noxt Plugin',
  requires: ['express','#noxt-router'],
}

const pageContextHooks = {};
const serverContextHooks = {};
const componentExportsHooks = {};
const registerPageHooks = {};
const registerComponentHooks = {};

export default mlm => {

  const collector = (coll, desc) => (conf, unit) => {
    for (const key in conf) {
      const fn = conf[key];
      mlm.assert.is.function(fn, desc);
      mlm.assert.not(key in coll, 'Duplicate ' + desc + ' ' + key);
      coll[key] = ({ fn, unit: unit.name });
    }
  }

  const runner = (
    coll, each = (_, fn, ...args) => fn(...args)
  ) => async (...args) => {
    for (const key in coll) {
      const { fn } = coll[key];
      await each(key, fn, ...args);
    }
  }

  const arrayCollector = (coll, desc) => (conf, unit) => {
    for (const key in conf) {
      const fn = conf[key];
      mlm.assert.is.function(fn, desc);
      coll[key] ??= [];
      coll[key].push({ fn, unit: unit.name });
    }
  }

  const arrayRunner = (
    coll, each = (_, fn, ...args) => fn(...args)
  ) => async (...args) => {
    for (const key in coll) {
      const handlers = coll[key];
      for (const handler of handlers) {
        await each(key, handler.fn, ...args);
      }
    }
  }
  const globalServerContext = {};
  return ({
    'register.pageContext': arrayCollector(pageContextHooks, 'page context handler'),
    'register.serverContext': arrayCollector(serverContextHooks, 'server context handler'),
    'register.componentExports': arrayCollector(componentExportsHooks, 'page export handler'),
    'register.registerPage': collector(registerPageHooks, 'register page handler'),
    'register.registerComponent': collector(registerComponentHooks, 'register component handler'),
    'define.noxt_context': {
      get: () => globalServerContext,
      enumerable: true
    },
    'serverContext.utils': () => mlm.utils,
    'serverContext.DEV': () => mlm.DEV,
    'serverContext.PROD': () => mlm.PROD,
    onStart: async () => {
      mlm.services.noxt.noxt_context({ ctx: globalServerContext });
      //mlm.log('ctx', mlm.serverContext);
    },
    'services.noxt': () => new class PluginService {
      noxt_context = arrayRunner(serverContextHooks,
        async (key, fn, { ctx }) => ctx[key] = await fn({ ctx })
      );

      noxt_hooks = {
        beforeRequest: [
          ({ ctx }) => {
            Object.assign(ctx, mlm.noxt_context);
          },
          arrayRunner(pageContextHooks,
            async (key, fn, args) => {
              args.ctx[key] = await fn(args)
            }
          ),
        ],
        beforeRender: arrayRunner(componentExportsHooks,
          async (key, fn, { module, props, ctx }) => {
            //mlm.log('beforeRender', unit, key, Object.keys(props));
            if (!(key in module)) return;
            const exported = module[key];
            await fn({ exported, props, ctx, module })
            //mlm.log('beforeRender', key, Object.keys(props));
          }
        ),
        registerPage: runner(registerPageHooks,
          async (key, fn, { module, component }) => {
            await fn({ module, component })
          }
        ),
        registerComponent: runner(registerComponentHooks,
          async (key, fn, { module, component }) => {
            await fn({ module, component })
          }
        )
      }

      report() {
        return {
          pageContext: pageContextHooks,
          serverContext: serverContextHooks,
          componentExports: componentExportsHooks,
          registerPage: registerPageHooks,
          registerComponent: registerComponentHooks
        }
      }
    },
    'registerPage.Link'({ component, module }) {
      const As = module.Link ?? 'a';
      component.Link = ({ text, children, attrs, ...props }, ctx) => {
        const href = component.getRoutePath(props, ctx);
        return { type: As, props: { ...attrs, href, children: text ?? children }  };
      }
    }
  })
}