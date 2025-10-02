export const info = {
  version: '1.0.0',
  description: 'Preload props from urls',
  requires: ['noxt-plugin','#fetch'],
}

export default mlm => ({
  'componentExports.fetch': async ({exported, props, ctx}) => {
    for (const id in exported) {
      let url = await mlm.utils.eval(exported[id], props, ctx);
     // mlm.log('fetching', id, url);
      try {
        const now = performance.now();
        const res = await ctx.fetch(url);
        mlm.log('fetched', id, url, (performance.now() - now).toFixed(3) +'ms');
        props[id] = await res.json();
        //mlm.log('fetched', url, JSON.stringify(props[id]).length);
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          mlm.throw(new Error('error fetching ' + url + ': ' + e));
        }
        mlm.error('fetch', url, e);
        props[id] = null;
      }
    }
  },
})