export const info = {
  name: 'noxt-router',
  description: 'Sets up a Noxt Router',
  requires: ['plugin'],
  provides: ['#noxt-router'],
  npm: {
    'noxt-js-middleware': '^1.0.4'
  },
}

export default mlm => ({
  'config.views': {
    is: ['string'],
    default: ['views']
  },
  'middleware.noxt': async (app) => {
    const { default: noxt } = await mlm.import('noxt-js-middleware');
    const noxtRouter = await noxt({
      context: mlm.noxt_context,
      views: mlm.config.views,
      hooks: mlm.services.noxt.noxt_hooks
    })
    return noxtRouter
  },
})