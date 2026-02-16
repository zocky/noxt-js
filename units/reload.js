export const info = {
  name: 'reload',
  description: 'Hot reload middleware',
  requires: ['express'],
  provides: ['#reload'],
}

const clients = new Set();
export default mlm => ({
  'services.reload': () => ({
    refresh: forceReload,
    error: sendError
  }),
  'define.refresh': () => forceReload,
  'define.error': () => sendError,
  'middleware.reload': async () => {
    const router = mlm.services.express.Router();
    router.get('/_reload.js', (req, res) => {
      res.logGroup = 'reload';
      res.set('Content-Type', 'text/javascript');
      res.send(reloadJs);
    });

    router.get('/_events', (req, res) => {
      res.logGroup = 'reload';
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

async function forceReload() {
  const promises = Array.from(clients).map(async client => {
    client.write('event: refresh\ndata:\n\n');
    return new Promise(resolve => client.end(resolve));
  });
  await Promise.all(promises);
}

async function sendError(error) {
  const errorData = {
    message: error.message,
    stack: error.stack,
    name: error.name
  };
  const data = JSON.stringify(errorData).replace(/\n/g, '\\n');

  clients.forEach(client => {
    client.write(`event: error\ndata: ${data}\n\n`);
  });
}

async function handleSignal() {
  const promises = Array.from(clients).map(async client => {
    client.write('event: reload\ndata:\n\n');
    return new Promise(resolve => client.end(resolve));
  });
  await Promise.all(promises);
  process.exit(0);
}

const reloadJs = `
const eventSource = new EventSource('/_events');
let reload = false;
let errorOverlay = null;

eventSource.addEventListener('connected', () => {
  if (reload) {
    console.log('%c NOXT ','color: #ffd; background-color: #080', 'Reloading...' );
    window.location.reload();
  } else {
    console.log('%c NOXT ', 'color: #ffd; background-color: #080', 'Connected.' );
  }
  hideError();
});

eventSource.addEventListener('reload', () => {
  console.log('%c NOXT ','color: #ffd; background-color: #080', 'Restarting...' );
  reload = true;
});

eventSource.addEventListener('refresh', () => {
  console.log('%c NOXT ','color: #ffd; background-color: #080', 'Refresh...' );
  window.location.reload();
});

eventSource.addEventListener('error', (e) => {
  const error = JSON.parse(e.data);
  console.error('%c NOXT ','color: #ffd; background-color: #f00', 'Error:', error.message);
  showError(error);
});

window.addEventListener('beforeunload', () => {
  eventSource.close();
});

function showError(error) {
  hideError();
  
  errorOverlay = document.createElement('dialog');
  errorOverlay.style.cssText = \`
    position: fixed;
    top: 0;
    max-width: 100vw;
    max-height: 100vh;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 20px;
    background: rgba(0, 0, 0, 0.95);
    color: #fff;
    border: none;
    font-family: monospace;
    overflow: auto;
  \`;
  
  errorOverlay.innerHTML = \`
    <h1 style="color: #f00; margin: 0 0 1em 0;">\${error.name || 'Error'}</h1>
    <p style="font-size: 16px; margin-bottom: 1em;">\${error.message}</p>
    <pre style="font-size: 14px; white-space: pre-wrap; overflow-x: auto;">\${error.stack || ''}</pre>
  \`;
  
  document.body.appendChild(errorOverlay);
  errorOverlay.showModal();
  
  errorOverlay.addEventListener('click', (e) => {
    if (e.target === errorOverlay) hideError();
  });
  
  const closeHandler = (e) => {
    if (e.key === 'Escape') {
      hideError();
      document.removeEventListener('keydown', closeHandler);
    }
  };
  document.addEventListener('keydown', closeHandler);
}

function hideError() {
  if (errorOverlay) {
    errorOverlay.close();
    errorOverlay.remove();
    errorOverlay = null;
  }
}
`