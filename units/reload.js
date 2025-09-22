export const info = {
  name: 'reload',
  description: 'Hot reload middleware',
  requires: ['noxt-plugin'],
  npm: {
    'express': '^5.0.0',
  },
}

const clients = new Set();
export default mlm => ({
  'pageContext.reload': ({ ctx }) => ctx.slot('script', 'noxt-reload', '/_reload.js'),
  'middleware.reload': async () => {
    const { default: express } = await mlm.import('express');
    const router = express.Router();
    router.get('/_reload.js', (req, res) => {
      res.set('Content-Type', 'text/javascript');
      res.send(reloadJs);
    });

    router.get('/_events', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'content-encoding': 'none'
      });
      res.write('\nevent:connected\ndata:\n\n');
      clients.add(res);
      res.on('close', () => {
        clients.delete(res);
        res.end();
      })
      req.on('error', () => clients.delete(res));
      res.on('error', () => clients.delete(res));
    });

    return router
  },
  onStart() {
    process.on('SIGUSR2', handleSignal)
  },
  onStop() {
    process.removeListener('SIGUSR2', handleSignal)
  }
})

async function handleSignal() {
  const promises = Array.from(clients).map(async client => {
    client.write('event: reload\ndata:\n\n');
    return new Promise(resolve => client.end(resolve));
  });
  await Promise.all(promises);
  process.exit(0);
};

const reloadJs = `
  const eventSource = new EventSource('/_events');
let reload = false;
eventSource.addEventListener('connected', () => {
  if (reload) {
    console.log('%c NOXT ','color: #ffd; background-color: #080', 'Reloading...' );
    window.location.reload();
  } else {
    console.log('%c NOXT ', 'color: #ffd; background-color: #080', 'Connected.' );
  }

});
eventSource.addEventListener('reload', () => {
  console.log('%c NOXT ','color: #ffd; background-color: #080', 'Restarting...' );
  reload = true;
});
window.addEventListener('beforeunload', () => {
  eventSource.close();
});
`