export const info = {
  name: 'express',
  description: 'Sets up an Express server',
  requires: ['plugin'],
  npm: {
    'express': '^5.0.0',
    'cookie-parser': '^1.4.6'
  },
}

export default async mlm => {
  let app;
  const middlewareNames = new Set();
  const middlewares = [];
  const { default: express } = await mlm.import('express');
  return {
    'services.express': () => new class {
      get app () {
        return app;
      }
      get Router() {
        return express.Router;
      }
      get express () {
        return express;
      }
    },
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
      return express.json();
    },
    'middleware.urlencoded': async (app) => {
      return express.urlencoded({ extended: true });
    },
    async onStart() {
      app = express();
      for (const middleware of middlewares) {
        const mw = await middleware.create(app);
        if (!mw) {
          continue;
        }
        if (middleware.path) {
          app.use(middleware.path, mw);
        } else {
          app.use(mw);
        }
      }
      app.use('/.well-known', (req, res, next) => {
        res.logGroup = 'well-known';
        res.status(404).send('Not found');
        res.end();
      });
      app.use((req, res, next) => {
        res.logGroup = '404';
        res.status(404).send('Not found');
      })
      app.use((error, req, res, next,) => {
        mlm.log('error', error);
        res.status(500).send(error.stack);
      })
      const server = app.listen(mlm.config.port, mlm.config.host, (error) => {
        if (error) {
          mlm.throw(error);
        }
        mlm.log(`Listening on ${mlm.config.host}:${mlm.config.port}`);
      });
      server.on('close', () => {
        mlm.log('Server closed');
      });
      app.on('error', (error) => {
        mlm.error(error);
        app.throw(error);
      });
    }
  }
}
