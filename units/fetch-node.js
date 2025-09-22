export const info = {
  name: 'fetch-node',
  version: '1.0.0',
  description: 'Native fetch',
  requires: ['noxt-plugin'],
  provides: ['#fetch'],
}

export default mlm => ({
  name: 'fetch-node',
  requires: ['noxt-plugin'],
  provides: ['#fetch'],
  description: 'Native fetch',
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

  'serverContext.fetch': () => fetchOrThrow,
});

async function fetchOrThrow(ctx, url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(res.statusText);
  return res;
}