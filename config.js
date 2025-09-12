import fs from 'fs';
import path from 'path';

export const handlers = {
  port: (val) => Number.isInteger(val) && val > 0 && val < 65536 ? + val : new Error('Port must be an integer between 1 and 65535'),
  host: (val) => typeof val === 'string' && val.length > 0 ? val : new Error('Host must be a non-empty string'),
  views: (val) => {
    val = [].concat(val); // ensure array
    for (const dir of val) {
      if (typeof dir !== 'string' || dir.length === 0 || !fs.existsSync(path.resolve(process.cwd(), dir))) {
        return new Error(`Each views directory must be a valid directory path. Invalid: ${dir}`);
      }
      return val;
    }
  },
  static: (val) => {
    if (!val) return val; // allow empty
    val = [].concat(val); // ensure array
    for (const dir of val) {
      if (typeof dir !== 'string' || dir.length === 0 || !fs.existsSync(path.resolve(process.cwd(), dir))) {
        return new Error(`Each static directory must be a valid directory path. Invalid: ${dir}`);
      }
      return val;
    }
  },
  logLevel: (val) => ['error', 'warn', 'info', 'debug'].includes(val) ? val : new Error('Log level must be one of: error, warn, info, debug'),
  ssl: (val) => {
    // either boolean false, or object with cert and key and any other options for https.createServer
    if (val === false) return val;
    if (typeof val === 'object' && val !== null && typeof val.cert === 'string' && val.cert.length > 0 && typeof val.key === 'string' && val.key.length > 0) {
      // check if files exist
      if (!fs.existsSync(path.resolve(process.cwd(), val.cert))) return new Error('SSL certificate file does not exist');
      if (!fs.existsSync(path.resolve(process.cwd(), val.key))) return new Error('SSL key file does not exist');
      return val;
    }
    return new Error('SSL must be a boolean false, or an object with cert and key');
  },
  logFile: (val) => (!val || typeof val === 'string' && val.length > 0) ? val : new Error('Log file must be a non-empty string'),
  context: async (val) => {
    // import a list of modules, and return an object with their exports
    if (!val) return []; // allow empty
    val = [].concat(val); // ensure array
    for (const mod of val) {
      console.log(`Importing context module: ${mod}`);
      if (typeof mod !== 'string' || mod.length === 0 || !fs.existsSync(path.resolve(process.cwd(), mod))) {
        return new Error(`Each context module must be a valid module path. Invalid: ${mod}`);
      }
      // import module
    }
    return val;
  },
}
/**
 * Register a handler for a config option
 * The handler is called with the config value, and should return the processed value
 * or an Error object if the value is invalid
 * 
 * @param {string} key 
 * @param {Function} handler 
 */
export function registerConfigHandler(key, handler = val=>val) {
  console.log(`Registering config handler for ${key}`);
  handlers[key] = handler;
}

export async function processConfig(config, warn) {
  const ret = {};
  for (const key in config) {
    if (handlers[key]) {
      const result = await handlers[key](config[key]);
      if (result instanceof Error) {
        console.error(`Invalid config option "${key}": ${result.message}`);
        process.exit(1);
      } else {
        if (result !== undefined) config[key] = result;
      }
    } else if (warn) {
      console.warn(`Unknown config option: ${key}`);
    }
    ret[key] = config[key];
  }
  return config;
}