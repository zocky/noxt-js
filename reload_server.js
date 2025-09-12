import express from 'express';
import fs from 'fs';
import path from 'path';
const __dirname = path.dirname(new URL(import.meta.url).pathname);

const router = express.Router();
export default router;

const clients = new Set();
router.get('/_events', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'content-encoding': 'none'
  });
  res.write('\nevent:connected\ndata:\n\n');
  clients.add(res);
  console.log('client connected');
  res.on('close', () => {
    console.log('client disconnected');
    clients.delete(res);
    res.end();
  })
});

const reloadJs = fs.readFileSync(path.join(__dirname, 'reload_client.js'), 'utf8');
router.get('/_reload.js', async (req, res) => {
  res.set('Content-Type', 'text/javascript');
  res.send(reloadJs);
});


process.on('SIGUSR2', async () => {
  console.log('beforeExit');
  const promises = Array.from(clients).map(async client => {
    console.log('restarting client')
    client.write('event: reload\ndata:\n\n');
    return new Promise(resolve => client.end(resolve));
  });
  await Promise.all(promises);
  process.exit(0);
});