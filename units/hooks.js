export const info = {
  name: 'hooks',
  version: '1.0.0',
  description: 'Hooks',
  requires: ['utils', 'services']
}
const hooks = {}
const hook_handlers = {}

export default mlm => {
  return ({
    'define.hooks': () => mlm.utils.readOnly(hooks, 'hooks'),
    'collect.hooks': ({
      target: hooks,
      is: 'function|boolean',
      mode: 'object',
      map: (fn, key) => {
        if (fn === false) return () => { };
        if (fn === true) return async (...args) => {
          for (const handler of hook_handlers[key] ?? []) {
            await handler(...args);
          }
        }
        if (mlm.is.function(fn)) {
          return async (...args) => {
            for (const handler of hook_handlers[key] ?? []) {
              await fn(handler, ...args);
            }
          }
        }
        mlm.throw('Cosmic ray: Invalid hook');
      }
    }),
    'collect.on': {
      target: hook_handlers,
      is: 'function',
      mode: 'array'
    }
  })
}