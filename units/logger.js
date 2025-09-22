export const info = {
  name: 'logger',
  version: '1.0.0',
  description: 'Minimal logger',
  requires: ['express'],
}

export default mlm => ({
  'middleware.logger': async (app) => {
     return (req, res, next) => {
        console.log(req.method, req.url);
        next();
     }
  },
})