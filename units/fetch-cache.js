export const info = {
  name: 'fetch-cache',
  version: '1.0.0',
  requires: ['noxt-plugin'],
  provides: ['#fetch'],
  description: 'Cached fetch',
  npm: {
    'node-fetch-cache': '^1.0.0',
  },
}

let fetchCache = null;

export default mlm => ({
  'config.fetch': {
    is: {
      ttl: 'integer|none',
      retry: 'positiveInteger|none',
      timeout: 'positiveInteger|none'
    },
    default: {
      ttl: 60 * 60 * 1000,
      retry: 2,
      timeout: 5000
    }
  },

  'pageContext.fetch': (props, ctx) => globalFetch.bind(null, ctx),
  'serverContext.fetch': () => globalFetch,

  async onStart() {
    const { default: nodeFetchCache } = await mlm.import('node-fetch-cache');
    const cfg = mlm.config.fetch;
    fetchCache = await nodeFetchCache.create({
      cache: undefined,
      ttl: cfg.ttl,
      retry: cfg.retry,
      timeout: cfg.timeout
    });
  }
});

async function globalFetch(ctx, url, options = {}) {
  if (ctx.req.headers.pragma === 'no-cache') options.cache = 'no-cache';
  const res = await fetchCache(url, options);
  if (!res.ok) throw new Error(res.statusText);
  return res;
}