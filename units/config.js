export const info = {
  name: 'config',
  version: '1.0.0',
  description: 'Config ',
  requires: ['utils','services'],
}

const config = {};
const config_is = {};
const config_defaults = {};
const config_defs = {}

function merge_deep(target, ...sources) {
    // If no sources, return target
    if (sources.length === 0) return target;
    
    // If target is not a plain object, return the first source (overwrite)
    if (!isPlainObject(target)) {
        return sources[0];
    }
    
    const result = Object.assign({}, target);
    
    for (const source of sources) {
        // If source is not a plain object, skip (treat as scalar)
        if (!isPlainObject(source)) {
            continue;
        }
        
        for (const [key, sourceValue] of Object.entries(source)) {
            const targetValue = result[key];
            
            // If both values are plain objects, merge recursively
            if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
                result[key] = merge_deep(targetValue, sourceValue);
            } 
            // Otherwise, overwrite target with source value
            else {
                result[key] = sourceValue;
            }
        }
    }
    
    return result;
}

// Helper function to check if value is a plain object
function isPlainObject(value) {
    if (value === null || typeof value !== 'object') {
        return false;
    }
    
    const proto = Object.getPrototypeOf(value);
    return proto === null || proto === Object.prototype;
}

export default mlm => ({
  'define.config': {
    get: () => config,
    enumerable: true,
    configurable: false
  },
  'register.config': (defs, unit) => {
    for (const key in defs) {
      const def = defs[key];
      mlm.assert.not(key in config_defs, 'Duplicate config key ' + key);
      mlm.assert.is({
        is: 'any|none',
        default: 'any|none',
        normalize: 'function|none'
      }, def, `config.${key}`);

      if ('default' in def) {
        config_defaults[key] = mlm.utils.eval(def.default);
      }
      config_defs[key] = {
        normalize: def.normalize,
        is: def.is,
        default: def.default,
        unit: unit
      };
    }
  },
  'utils.merge_deep': merge_deep,
  'services.config': () => new class ConfigService {
    process(userConfig) {
      const merged = merge_deep({}, config_defaults, userConfig);
      const ret = {};
      for (const key in config_defs) {
        const { is: type, normalize } = config_defs[key];
        if (key in merged) {
          if (normalize) {
            merged[key] = normalize(merged[key]);
          }

          mlm.assert.is(type, merged[key], `config.${key}`);
          ret[key] = merged[key];
        }
      }
      return ret;
    }
    merge(userConfig) {
//      console.log('initial',config_defaults,userConfig)
      Object.assign(config, this.process(userConfig));
//      console.log(userConfig,'final',config)
    }
    get_defs() {
      return {
        config_defs,
        config_is,
        config_defaults
      };
    }
  },
})