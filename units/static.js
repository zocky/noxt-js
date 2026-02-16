import fs from "fs";
export const info = {
  name: 'static',
  description: 'Static middleware',
  requires: ['express'],
}

import { resolve } from 'path';

export default mlm => ({
  'config.static': {
    is:   'string',
    default: 'public',
    
  },

  'middleware.static': async () => {
    const dir = mlm.config.static;
    if (!dir) return null;
    const { static: serveStatic } = await mlm.import('express');
    return serveStatic(resolve(dir), {
      setHeaders: res => res.logGroup = 'static',
    });
  },
})