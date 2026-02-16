export const info = {
  name: 'noxt-router',
  description: 'Sets up a Noxt Router',
  requires: ['noxt-plugin'],
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
  'middleware.noxt': async (app) => {
    const { default: noxt } = await mlm.import('noxt-js-middleware');
    const noxtRouter = await noxt({
      views: mlm.config.views,
      hooks: mlm.services.noxt.hooks
    })
    return noxtRouter
  },
})