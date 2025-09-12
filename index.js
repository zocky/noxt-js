import express, { json, urlencoded } from 'express';
import  serve_static from 'serve-static';
import { resolve } from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import noxt from 'noxt-js-middleware';
import { readFileSync } from 'fs';
import { createServer } from 'https';
import reloadServer from './reload_server.js';

/**
 * Starts a Noxt server based on a fully resolved config object.
 * @param {Object} config - Configuration object
 * @param {number} config.port - Port to listen on
 * @param {string|string[]} config.views - Path(s) to JSX components
 * @param {Object} config.context - Context object to inject into components
 * @param {string} [config.staticDir] - Optional static files directory
 * @param {Object|boolean} [config.ssl] - false or { cert, key, ca }
 * @param {string} [config.layout] - Default layout component name
 * @returns {Promise<{app: express.Application, server: import('http').Server|import('https').Server}>}
 */
export async function startServer (config) {
  const app = express();

  // Basic middleware
  app.use(logger('dev'));
  app.use(json());
  app.use(urlencoded({ extended: false }));
  app.use(cookieParser());

  // Reload server for development
  if (process.env.NODE_ENV !== 'production') {
    app.use(reloadServer);
  }

  // Serve static files if provided
  for (const dir of [].concat(config.static).flat(Infinity).filter(Boolean)) {
    app.use(serve_static(resolve(dir)));
  }

  // Mount the Noxt router
  const router = await noxt({
    directory: config.views,
    context: config.context,
    layout: config.layout,
  });
  app.use(router);

  // Default error handler
  app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.send(err.message || 'Internal Server Error');
  });

  let server;
  if (config.ssl && config.ssl !== false) {
    const sslOptions = {
      key: readFileSync(resolve(config.ssl.key)),
      cert: readFileSync(resolve(config.ssl.cert)),
    };
    if (config.ssl.ca) sslOptions.ca = readFileSync(resolve(config.ssl.ca));
    server = createServer(sslOptions, app);
    server.listen(config.port, () => {
      console.log(`Noxt HTTPS server running on https://localhost:${config.port}`);
    });
  } else {
    server = app.listen(config.port, () => {
      console.log(`Noxt HTTP server running on http://localhost:${config.port}`);
    });
  }

  return { app, server };
}
