export const info = {
  name: 'fetch-cache-fs',
  version: '1.0.0',
  description: 'Cached fetch with filesystem cache',
  requires: ['noxt-plugin'],
  provides: ['#fetch'],
  npm: {
    'node-fetch-cache': '^1.0.0',
  },
}

let fetchCache = null;

export default mlm => ({
  'config.fetch': {
    is: {
      cacheDir: 'string',
      ttl: 'integer|none',
      enabled: 'boolean',
      retry: 'positiveInteger',
      timeout: 'positiveInteger'
    },
    default: {
      enabled: true,
      cacheDir: '.cache/fetch-cache',
      ttl: 60 * 60 * 1000,
      retry: 2,
      timeout: 5000
    },
  },
  'pageContext.fetch': ({ ctx }) => globalFetch.bind(null, ctx),
  'serverContext.fetch': () => globalFetch,
  'onStart': async () => {
    const { default: nodeFetchCache, FileSystemCache } = await mlm.import('node-fetch-cache');
    const cfg = mlm.config.fetch;
    fetchCache = nodeFetchCache.create({
      cache: cfg.enabled ? new FileSystemCache({ cacheDirectory: cfg.cacheDir }) : undefined,
      ttl: cfg.ttl,
      retry: cfg.retry,
      timeout: cfg.timeout
    });
  }
});

async function globalFetch(ctx, url, options = {}) {
  let res = await fetchCache(url, options);
  if (ctx.req.headers.pragma === 'no-cache' && !res.isCacheMiss) {
    console.log('reload', url);
    res.ejectFromCache();
    res = await fetch(url, options);
  }
  if (!res.ok) throw new Error(res.statusText);
  return res;
}