export const info = {
  name: 'noxt-router-dev',
  description: 'Sets up a Noxt Router',
  requires: ['noxt-plugin','reload'],
  provides: ['#noxt-router'],
  npm: {
    'noxt-js-middleware': '^1.0.4'
  },
}

export default mlm => ({
  'config.views': {
    normalize: p => [p].flat(),
    is: ['string'],
    default: ['views']
  },
  'middleware.noxt': async () => {
    const { default: noxt } = await mlm.import('noxt-js-middleware');
    const noxtRouter = await noxt({
      context: mlm.services.noxt.context,
      views: mlm.config.views,
      hooks: mlm.services.noxt.hooks,
      watch: true
    })
    /*
    const devRouter = await noxt({
      context: mlm.noxt_context,
      views: mlm.config.views,
      hooks: mlm.services.noxt.noxt_hooks,
      noxt: noxtRouter
    })
    //noxtRouter.use('/dev', devRouter)
    */
    return noxtRouter
  },
  'componentChanged.reload': ({ name, component }) => {
    mlm.services.reload.refresh();
  },
  'componentError.reload': async ({ name, error }) => {
    mlm.services.reload.error(error);
  },
  'requestContext.reload': ({ ctx }) => ctx.slot('script', 'noxt-reload', '/_reload.js'),
})