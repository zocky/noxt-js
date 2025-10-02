export const info = {
  name: 'express',
  description: 'Sets up an Express server',
  requires: ['plugin'],
  npm: {
    'express': '^5.0.0',
    'cookie-parser': '^1.4.6'
  },
}

let app;
const middlewareNames = new Set();
const middlewares = [];
export default mlm => ({
  'define.express': { get: () => app },
  'register.middleware': (conf, unit) => {
    for (const key in conf) {
      mlm.assert.not(key in middlewareNames, 'Duplicate middleware ' + key);
      middlewareNames.add(key);
      let c = conf[key];
      if (mlm.is.function(c)) {
        c = { create: c };
      }
      mlm.assert.is({
        path: 'string|none',
        create: 'function'
      }, c, 'middleware');
      mlm.assert.is.function(c.create, 'middleware');
      middlewares.push({ ...c, unit: unit.name });
    }
  },
  'config.port': {
    is: v => Number.isInteger(v) && v > 0 && v < 65536,
    default: 3000
  },
  'config.host': {
    is: 'string',
    default: 'localhost'
  },
  'middleware.json': async (app) => {
    const { default: express } = await mlm.import('express');
    return express.json();
  },
  'middleware.urlencoded': async (app) => {
    const { default: express } = await mlm.import('express');
    return express.urlencoded({ extended: true });
  },
  async onStart() {
    const { default: express } = await mlm.import('express');
    app = express();
    for (const middleware of middlewares) {
      const mw = await middleware.create(app);
      if (middleware.path) {
        app.use(middleware.path, mw);
      } else {
        app.use(mw);
      }
    }
    app.listen(mlm.config.port, mlm.config.host, () => {
      mlm.log(`Listening on ${mlm.config.host}:${mlm.config.port}`);
    });
  },
})