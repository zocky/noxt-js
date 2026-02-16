export const info = {
  name: 'fetch',
  version: '1.0.0',
  description: 'Preload props from URLs',
  requires: ['noxt-plugin', '#fetch'],
}

export default mlm => ({
  'requestContext.fetch': ({ ctx }) => {
    // Wrapper that respects request cache headers
    return (url, options = {}) => {
      const forceFresh = ctx.req.headers.pragma === 'no-cache';
      return mlm.services.fetch.fetch(url, {
        ...options,
        cache: forceFresh ? 'no-cache' : options.cache,
        cors: true
      });
    };
  },

  'componentExports.fetch': async ({ component, exported, props, ctx }) => {
    const promises = [];
    const ids = [];
    const urls = [];
    
    for (const id in exported) {
      try {
        const url = await mlm.utils.eval(exported[id], props, ctx);
        ids.push(id);
        urls.push(url);
        promises.push(ctx.fetch(url).then(res => res.json()));
      } catch (e) {
        props[id] = null;
      }
    }

    const results = await Promise.allSettled(promises);

    results.forEach((result, index) => {
      props[ids[index]] = result.status === 'fulfilled' ? result.value : null;
    });
  },
});