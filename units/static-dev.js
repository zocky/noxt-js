import fs from "fs";
export const info = {
  name: 'static-dev',
  description: 'Static dev middleware',
  requires: ['express', 'reload'],
}

import { resolve } from 'path';

export default mlm => {
  let watcher = null;
  return {
    'config.static': {
      is: 'string',
      default: 'public',

    },

    'middleware.static': async () => {
      const dir = mlm.config.static;
      if (!dir) return null;

      watcher = fs.watch(dir, { recursive: true }, mlm.utils.debounce(() => {
        mlm.services.reload.refresh()
      }, 50))

      const { static: serveStatic } = await mlm.import('express');
      return serveStatic(resolve(dir), {
        etag: false,
        cacheControl: false,
        setHeaders: res => res.logGroup = 'static',
      });
    },
    onStop() {
      const dir = mlm.config.static;
      if (watcher) {
        watcher.close();
        watcher = null;
      }
    }
  }
}