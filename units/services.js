export const info = {
  name: 'services',
  version: '1.0.0',
  description: 'Services',
  requires: ['utils']
}

const services = {}

export default mlm => ({
  'define.services': () => mlm.utils.readOnly(services, 'services'),
  'register.services': mlm.utils.collector(services, {
    is: 'function',
    mode: 'object',
    map: (fn, key) => {
      const service = fn(mlm)
      mlm.assert.is.object(service, 'service');
      return service
    }
  }),
})