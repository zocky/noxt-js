export const info = {
  name: 'utils',
  version: '1.0.0',
  description: 'Utils',
  //requires: ['env']
}
export default mlm => {

  const utils = {};
  utils.debounce = (fn, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    }
  }
  utils.eval = (fn, ...args) => typeof fn === 'function' ? fn(...args) : fn;
  utils.readOnly = (obj, { label = 'object' } = {}) => new Proxy(obj, {
    get: (t, k) => t[k],
    set: (t, k, v) => { mlm.throw(label + ' is read-only'); }
  });
  utils.collector = (target, {
    map, is, filter,
    label = 'object',
    mode = 'object',
    override = false
  } = {}) => {
    const modes = {
      array: () => source => {
        for (let value of [].concat(source)) {
          if (filter && !filter(value)) continue;
          if (is) mlm.assert.is(is, value, label);
          if (map) value = map(value);
          target.push(value);
        }
      },
      object: () => source => {
        for (const key in source) {
          if (!override && key in target) {
            mlm.throw('Duplicate key' + key + ' in ' + label);
          }
          let value = source[key];
          if (filter && !filter(value, key)) continue;
          if (is) mlm.assert.is(is, value, label + '.' + key);
          if (map) value = map(value, key);
          target[key] = value;
        }
      },
      arrays: () => source => {
        for (const key in source) {
          let values = [source[key]].flat(Infinity);
          target[key] ??= [];
          for (let value of values) {
            if (filter && !filter(value, key)) continue;
            if (is) mlm.assert.is(is, value, label + '.' + key);
            if (map) value = map(value, key);
            target[key].push(value);
          }
        }
      },
      directory: () => source => {
        for (const key in source) {
          let values = source[key];
          target[key] ??= {};
          for (const id in values) {
            if (!override && id in target[key]) {
              mlm.throw('Duplicate key' + id + ' in ' + label + '.' + key);
            }
            let value = values[id];
            if (filter && !filter(value, key)) continue;
            if (is) mlm.assert.is(is, value, label + '.' + key);
            if (map) value = map(value, key);
            target[key][id] = value;
          }
        }
      }
    }
    mlm.assert(mode in modes, 'Unknown mode ' + mode);
    return modes[mode]();
  }
  
  return ({
    'define.utils': () => utils.readOnly(utils, 'utils'),
    'register.collect': async (confs,unit) => {
      for (const key in confs) {
        const { target, ...conf } = confs[key];
        conf.label = key;
        await mlm.inject({
          [`register.${key}`]: utils.collector(target, conf),
        }, unit);
        if (unit[key]) {
          mlm.inject({
            [key]: unit[key]
          }, unit);
        }
      }
    },
    'register.utils': utils.collector(utils, { is: 'function', mode: 'object', map: (fn, key) => { mlm.log('utils', key); return fn; } }),
  })
}