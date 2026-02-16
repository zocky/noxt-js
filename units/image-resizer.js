export const info = {
  name: 'image-resizer',
  description: 'Image resizing and caching service',
  requires: ['express'],
  provides: ['#image-resizer'],
  npm: {
    'sharp': '^0.33.0',
  },
}

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

// Pure helper functions (don't need mlm)
function generateHash(options, maxLength = 16) {
  const str = JSON.stringify(options);
  const fullHash = crypto.createHash('sha256').update(str).digest('base64url');
  return fullHash.substring(0, maxLength);
}

function normalizeFormat(format) {
  if (!format) return 'jpeg';
  if (format === 'jpg') return 'jpeg';
  return format;
}

function getShardedPath(hash, ext, depth, segmentLength) {
  const segments = [];
  for (let i = 0; i < depth; i++) {
    segments.push(hash.substring(i * segmentLength, (i + 1) * segmentLength));
  }
  segments.push(`${hash}.${ext}`);
  return segments.join('/');
}

export default async mlm => {
   const sharp = (await mlm.import('sharp')).default;

  async function getMetadata(hash) {
    const shardPath = getShardedPath(hash, 'json', mlm.config.imageResizer.shardDepth, mlm.config.imageResizer.shardSegmentLength);
    const metaPath = path.join(path.resolve(mlm.config.imageResizer.storage), shardPath);
    try {
      const data = await fs.readFile(metaPath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      return null;
    }
  }

  async function saveMetadata(hash, metadata) {
    const shardPath = getShardedPath(hash, 'json', mlm.config.imageResizer.shardDepth, mlm.config.imageResizer.shardSegmentLength);
    const metaPath = path.join(path.resolve(mlm.config.imageResizer.storage), shardPath);
    await fs.mkdir(path.dirname(metaPath), { recursive: true });
    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));
  }

  async function processImage(hash, metadata) {
    const format = metadata.format;
    const ext = format === 'jpeg' ? 'jpg' : format;
    const shardPath = getShardedPath(hash, ext, mlm.config.imageResizer.shardDepth, mlm.config.imageResizer.shardSegmentLength);
    const filePath = path.join(path.resolve(mlm.config.imageResizer.storage), shardPath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Download image
    const response = await fetch(metadata.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText} ${metadata.url}`);
    }

    const buffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);

    // Process with sharp
    let image = sharp(imageBuffer);
    const options = metadata.options;

    // Resize if dimensions provided
    if (options.width || options.height) {
      const resizeOptions = {
        width: +options.width || null,
        height: +options.height || null,
        fit: options.fit === 'crop' ? 'cover' : options.fit,
        withoutEnlargement: options.fit === 'crop'
      };

      // Add background color if specified (for contain fit letterboxing)
      if (options.background) {
        resizeOptions.background = options.background;
      }

      image = image.resize(resizeOptions);

      // If crop fit, extract exact dimensions
      if (options.fit === 'crop' && options.width && options.height) {
        image = image.extract({
          left: 0,
          top: 0,
          width: +options.width,
          height: +options.height
        });
      }
    }

    // Set format and quality
    switch (format) {
      case 'jpeg':
        image = image.jpeg({ quality: options.quality });
        break;
      case 'png':
        image = image.png();
        break;
      case 'webp':
        image = image.webp({ quality: options.quality });
        break;
      case 'avif':
        image = image.avif({ quality: options.quality });
        break;
    }

    // Process and save
    const processedBuffer = await image.toBuffer();
    await fs.writeFile(filePath, processedBuffer);

    // Update metadata
    metadata.lastProcessed = new Date().toISOString();
    await saveMetadata(hash, metadata);

    return processedBuffer;
  }

  async function resizeImage(url, options = {}) {
    if (!url) {
      throw new Error('URL is required');
    }

    // Normalize format
    const format = normalizeFormat(options.format);

    // Merge with defaults
    const opts = {
      url,
      width: options.width || null,
      height: options.height || null,
      fit: options.fit || 'cover',
      format,
      quality: options.quality || 80,
      ...options
    };

    const hash = generateHash(opts, mlm.config.imageResizer.maxHashLength);

    // Save metadata
    const metadata = {
      url,
      format,
      options: opts,
      created: new Date().toISOString(),
      hash,
    };

    await saveMetadata(hash, metadata);

    // Return URL with extension and sharded path
    const ext = format === 'jpeg' ? 'jpg' : format;
    const shardPath = getShardedPath(hash, ext, mlm.config.imageResizer.shardDepth, mlm.config.imageResizer.shardSegmentLength);
    return `${mlm.config.imageResizer.route}/${shardPath}`;
  }

  async function refreshImage(hash) {
    const metadata = await getMetadata(hash);
    if (!metadata) {
      throw new Error('Image not found');
    }
    return processImage(hash, metadata);
  }

  return {
    'config.imageResizer': {
      is: {
        route: 'string',
        storage: 'string',
        timeout: 'positiveInteger|none',
        maxFileSize: 'positiveInteger|none',
        maxHashLength: 'positiveInteger',
        shardDepth: 'positiveInteger',
        shardSegmentLength: 'positiveInteger',
      },
      default: {
        route: '/_images',
        storage: '.cache/images',
        timeout: 10000,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxHashLength: 16,
        shardDepth: 2,
        shardSegmentLength: 2,
      }
    },

    'services.imageResizer': () => ({
      resize: (url, options = {}) => resizeImage(url, options),
      getInfo: (hash) => getMetadata(hash),
      refresh: (hash) => refreshImage(hash),
    }),

    'middleware.imageResizerServe': async () => {
      const { default: express } = await mlm.import('express');
      const router = express.Router();

      // Static middleware runs FIRST, mounted at the configured route
      router.use(mlm.config.imageResizer.route, express.static(path.resolve(mlm.config.imageResizer.storage), {
        maxAge: '1y',
        immutable: true,
        setHeaders: res => res.logGroup = 'static',
      }));

      return router;
    },

    'middleware.imageResizerProcess': async () => {
      const { default: express } = await mlm.import('express');
      const router = express.Router();

      // This runs SECOND, only if static didn't find the file
      router.get(`${mlm.config.imageResizer.route}/*path`, async (req, res, next) => {
        res.logGroup = 'image-resizer';
        try {
          const fullPath = req.params.path.join('/');

          // Extract hash from path (remove extension and any directory segments)
          const filename = path.basename(fullPath);
          const hash = filename.replace(/\.[^.]+$/, '');

          const metadata = await getMetadata(hash);
          if (!metadata) {
            return res.status(404).send('Image not found');
          }

          const noCache = req.headers.pragma === 'no-cache' ||
            req.headers['cache-control']?.includes('no-cache');

          // Process and serve the image
          try {
            const imageBuffer = await processImage(hash, metadata);

            // Set content type
            const mimeTypes = {
              'jpeg': 'image/jpeg',
              'png': 'image/png',
              'webp': 'image/webp',
              'avif': 'image/avif',
            };

            res.set('Content-Type', mimeTypes[metadata.format] || 'image/jpeg');
            res.set('Cache-Control', 'public, max-age=31536000, immutable');
            res.send(imageBuffer);
          } catch (err) {
            mlm.log('Image processing failed:', err.message);
            return res.status(502).send('Failed to process image');
          }
        } catch (err) {
          next(err);
        }
      });

      return router;
    },

    async onStart() {
      // Ensure storage directory exists
      await fs.mkdir(path.resolve(mlm.config.imageResizer.storage), { recursive: true });

      // Import dependencies
    }
  };
};