// units/compression.js
export const info = {
  name: 'compression',
  version: '1.0.0',
  description: 'Response compression',
  requires: ['express'],
  npm: {
    'compression': '^1.8.0'
  },

}

export default mlm => ({
  'config.compression': {
    is: {
      enabled: 'boolean',
      level: 'number',  // 0-9, default 6
      threshold: 'number',  // bytes, default 1024
    },
    default: {
      enabled: true,
      level: 6,
      threshold: 1024,  // only compress responses > 1kb
    },
  },
  
  'middleware.compression': async () => {
    const { enabled, level, threshold } = mlm.config.compression;
    if (!enabled) return null;
    const compression = (await mlm.import('compression')).default;
    return compression({ level, threshold });
  },
});