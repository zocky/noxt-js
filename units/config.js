export const info = {
  name: 'config',
  version: '1.0.0',
  description: 'Config ',
  requires: ['utils','services'],
}

const config_is = {};
const config_defaults = {};
const config_defs = {}

function merge_deep(target, ...sources) {
  if (!sources.length) return target;
  
  const source = sources.shift();
  
  if (is_plain(target) && is_plain(source)) {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        // If target doesn't have this key, simply assign
        if (!target.hasOwnProperty(key)) {
          target[key] = source[key];
        } 
        // If both target and source have this key and both are plain objects, recurse
        else if (is_plain(target[key]) && is_plain(source[key])) {
          merge_deep(target[key], source[key]);
        }
        // If target has a non-plain object value, ignore (don't overwrite or try to merge into it)
        // else: do nothing (keep target's existing value)
      }
    }
  }
  
  return merge_deep(target, ...sources);
}

function is_plain(obj) {
  return obj !== null && 
         typeof obj === 'object' && 
         (obj.constructor === Object || obj.constructor === null);
}

export default mlm => ({
  'define.config': () => ({}),
  'register.config': (defs, unit) => {
    for (const key in defs) {
      const def = defs[key];
      mlm.assert.not(key in config_defs, 'Duplicate config key ' + key);
      mlm.assert.is({
        is: 'any|none',
        default: 'any|none'
      }, def, `config.${key}`);

      if ('default' in def) {
        config_defaults[key] = mlm.utils.eval(def.default);
      }
      config_defs[key] = {
        is: def.is,
        default: def.default,
        unit: unit
      };
    }
  },
  'utils.merge_deep': merge_deep,
  'services.config': () => new class ConfigService {
    process(config) {
      const merged = merge_deep({}, config_defaults, config);
      const ret = {};
      for (const key in config_defs) {
        const { is: type } = config_defs[key];
        if (key in merged) {
          mlm.assert.is(type, merged[key], `config.${key}`);
          ret[key] = merged[key];
        }
      }
      return ret;
    }
    get_defs() {
      return {
        config_defs,
        config_is,
        config_defaults
      };
    }
  },
  onStart(config) {
    Object.assign(mlm.config, mlm.services.config.process(config));
  }
})