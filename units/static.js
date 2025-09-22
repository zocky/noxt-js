export const info = {
  name: 'static',
  description: 'Static middleware',
  requires: ['express'],
  npm: {
    'serve-static': '^1.15.0'
  },
}

export default mlm => ({
  'config.static': {
    is: 'string',
    default: 'public'
  },
  'middleware.static': async (app) => {
     const { default: serve_static } = await mlm.import('serve-static');
     const { resolve } = await mlm.import('path');
     const dir = mlm.config.static;
     return serve_static(resolve(dir));
  },
})