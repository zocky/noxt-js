export const info = {
  name: 'logger',
  version: '1.0.1',
  description: 'Noxt logger',
  requires: ['express'],
}

export default mlm => ({
  'config.logger': {
    is: {
      level: 'string',
      format: 'string',
      exclude: { $any: [['string'], 'string', 'null'] },
    },
    default: {
      level: 'info',
      format: 'combined',
      exclude: null
    },

  },
  'middleware.logger': async () => {
    let { level, format, exclude } = mlm.config.logger;
    exclude = exclude
      ? [].concat(exclude)
      : null;

    return (req, res, next) => {
      const start = process.hrtime.bigint();
      const time = new Date();
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
      const ua = req.headers['user-agent'] || '-';

      const _send = res.send.bind(res);
      res.send = (body) => {
        try {
          res._realBodySize = Buffer.byteLength(body);
        } catch (e) {
          res._realBodySize = 0;
        };
        _send(body);
      }

      res.on('finish', () => {

        const used = process.memoryUsage();
        const memory = used.heapUsed / 1024 / 1024;
        const dur = Number(process.hrtime.bigint() - start) / 1e6; // ms
        if (exclude && exclude.includes(res.logGroup)) return;
        const parts = [
          time.toISOString().slice(0, 19).replace('T', ' '),
          memory.toFixed(0).padStart(3, ' ') + 'M',
          ip,
          dur.toFixed(0).padStart(4, ' ') + 'ms',
          (res._realBodySize / 1024).toFixed(0).padStart(4, ' ') + 'K',
          res.statusCode,
          req.method + ' ' +
          req.originalUrl || req.url,
          //ua
        ]
        mlm.log(parts.join(' | '));
      });
      next();
    }
  },
});