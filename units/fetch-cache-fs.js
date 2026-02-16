export const info = {
  name: 'fetch-cache-fs',
  version: '1.0.0',
  provides: ['#fetch'],
  description: 'Cached fetch with stale-while-revalidate',
}

import { createHash } from 'crypto';
import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import { join } from 'path';

export default mlm => {
  const inflight = new Map();
  const refreshing = new Map();

  async function cachedFetch(url, options = {}) {
    const forceFresh = options.cache === 'no-cache';
    const isGet = !options.method || options.method === 'GET';
    
    if (!isGet) return fetchWithRetry(url, options);
    
    const cacheKey = createHash('sha256').update(url).digest('hex');
    const cachePath = join(mlm.config.fetch.cacheDir, cacheKey + '.json');
    
    if (inflight.has(cacheKey)) {
      return inflight.get(cacheKey);
    }
    
    if (!forceFresh) {
      const cached = await readCache(cachePath);
      if (cached) {
        const age = Date.now() - cached.cachedAt;
        
        if (age <= mlm.config.fetch.stale) {
          return toResponse(cached);
        }
        
        if (age <= mlm.config.fetch.ttl) {
          refreshInBackground(url, cachePath, options, cacheKey);
          return toResponse(cached);
        }
      }
    }
    
    const promise = (async () => {
      try {
        const res = await fetchWithRetry(url, options);
        
        if (res.ok) {
          const body = await res.text();
          await writeCache(cachePath, res, body);
          return new Response(body, { status: res.status, headers: res.headers });
        }
      } catch (error) {
        // Fetch failed completely - fall through to stale cache check
        mlm.log('fetch failed, checking for stale cache:', error.message);
      }
      
      // Fallback to stale cache on error or non-ok response
      const cached = await readCache(cachePath);
      if (cached && Date.now() - cached.cachedAt <= mlm.config.fetch.ttl) {
        mlm.log('returning stale cache for', url);
        return toResponse(cached);
      }
      
      // No cache available, throw or return error response
      throw new Error(`Failed to fetch ${url} and no cache available`);
    })();
    
    inflight.set(cacheKey, promise);
    
    try {
      return await promise;
    } finally {
      inflight.delete(cacheKey);
    }
  }

  async function refreshInBackground(url, cachePath, options, cacheKey) {
    if (refreshing.has(cacheKey)) {
      return;
    }
    
    const promise = (async () => {
      try {
        const res = await fetchWithRetry(url, options);
        if (res.ok) {
          const body = await res.text();
          await writeCache(cachePath, res, body);
        }
      } catch {}
    })();
    
    refreshing.set(cacheKey, promise);
    
    try {
      await promise;
    } finally {
      refreshing.delete(cacheKey);
    }
  }

  async function fetchWithRetry(url, options) {
    let lastError;
    
    for (let i = 0; i <= mlm.config.fetch.retry; i++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), mlm.config.fetch.timeout);
      
      try {
        mlm.log('fetching', url);
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeout);
        return res;
      } catch (e) {
        mlm.log('failed',url,e.message)
        clearTimeout(timeout);
        lastError = e;
        if (i < mlm.config.fetch.retry) {
          await new Promise(r => setTimeout(r, 100 * (i + 1)));
        }
      }
    }
    
    throw lastError;
  }

  async function readCache(path) {
    try {
      const stats = await stat(path);
      const data = JSON.parse(await readFile(path, 'utf8'));
      data.cachedAt = stats.mtimeMs;
      return data;
    } catch {
      return null;
    }
  }

  async function writeCache(path, res, body) {
    await writeFile(path, JSON.stringify({
      url: res.url,
      status: res.status,
      headers: Object.fromEntries(res.headers),
      body,
    }));
  }

  function toResponse(cached) {
    return new Response(cached.body, {
      status: cached.status,
      headers: new Headers(cached.headers),
    });
  }

  return {
    'config.fetch': {
      is: {
        cacheDir: 'string',
        ttl: 'integer',
        stale: 'integer',
        retry: 'positiveInteger',
        timeout: 'positiveInteger'
      },
      default: {
        cacheDir: '.cache/fetch',
        ttl: 24 * 60 * 60 * 1000,
        stale: 60 * 60 * 1000,
        retry: 2,
        timeout: 5000
      }
    },

    'services.fetch': () => ({ 
      fetch: cachedFetch,
    }),

    async onStart() {
      await mkdir(mlm.config.fetch.cacheDir, { recursive: true });
    }
  };
};