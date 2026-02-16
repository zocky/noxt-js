export const info = {
  name: 'noxt-plugin',
  description: 'Noxt Plugin',
  requires: ['express'],
}


export default mlm => {
  const componentErrorHooks = {};
  const requestContextHooks = {};
  const serverContextHooks = {};
  const componentExportsHooks = [];
  const registerPageHooks = {};
  const registerComponentHooks = {};
  const componentChangedHooks = {}

  const globalServerContext = {};
  return ({
    'collect.requestContext': {
      target: requestContextHooks,
      is: 'function',
      mode: 'object'
    },
    'collect.componentExports': {
      target: componentExportsHooks,
      is: 'object',
      mode: 'array'
    },
    'collect.serverContext': {
      target: serverContextHooks,
      is: 'function',
      mode: 'object'
    },
    'collect.registerPage': {
      target: registerPageHooks,
      is: 'function',
      mode: 'object',
    },
    'collect.registerComponent': {
      target: registerComponentHooks,
      is: 'function',
      mode: 'object',
    },
    'collect.componentChanged': {
      target: componentChangedHooks,
      is: 'function',
      mode: 'object',
    },
    'collect.componentError': {
      target: componentErrorHooks,
      is: 'function',
      mode: 'object',
    },
    'serverContext.services': () => mlm.services,
    'serverContext.utils': () => mlm.utils,
    'serverContext.DEV': () => mlm.DEV,
    'serverContext.PROD': () => mlm.PROD,
    onStart: async () => {
      const ctx = globalServerContext;
      for (const key in serverContextHooks) {
        ctx[key] = await serverContextHooks[key]({ ctx });
      }
    },
    'services.noxt': () => new class NoxtPluginService {
      get context() {
        return globalServerContext;
      }
      get hooks() {
        return {
          beforeRequest: async ({ ctx }) => {
            Object.assign(ctx, this.context);
            for (const key in requestContextHooks) {
              ctx[key] = await requestContextHooks[key]({ ctx });
            }
          },
          beforeRender: async ({ ...args }) => {
            for (const item of componentExportsHooks) {
              for (const key in item) {
                if (!(key in args.module)) continue;
                await item[key]({ exported: args.module[key], ...args });
              }
            }
          },
          registerPage: async ({ module, component }) => {
            for (const fn of Object.values(registerPageHooks)) {
              await fn({ module, component });
            }
          },
          registerComponent: async (...args) => {
            for (const fn of Object.values(registerComponentHooks)) {
              await fn(...args);
            }
          },
          componentChanged: async ({ module, component }) => {
            for (const fn of Object.values(componentChangedHooks)) {
              await fn({ module, component });
            }
          },
          componentError: async ({ name, error }) => {
            for (const fn of Object.values(componentErrorHooks)) {
              await fn({ name, error });
            }
          }
        }
      }
    },
    'registerPage.Link'({ component, module }) {
      const As = module.Link ?? 'a';
      component.Link = ({ text, children, attrs, ...props }, ctx) => {
        const href = component.getRoutePath(props, ctx);
        return { type: As, props: { ...attrs, href, children: text ?? children } };
      }
    },
  })
}