export const info = {
  name: 'hooks',
  version: '1.0.0',
  description: 'Hooks',
  requires: ['utils','services']
}
const hooks = {}
const hook_handlers = {}

export default mlm => {
  return ({
    'define.hooks': () => mlm.utils.readOnly(hooks, 'hooks'),
    'register.hooks': mlm.utils.collector(hooks, {
      is: 'function',
      mode: 'object',
      map: (fn, key) => (...args) => {
        for (const handler of hook_handlers[key] ?? []) {
          fn(handler, ...args);
        }
      }
    }),
    'register.on': mlm.utils.collector(hook_handlers, {
      is: 'function',
      mode: 'array'
    })
  })
}