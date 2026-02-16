export const info = {
  name: 'bundler',
  version: '1.0.0',
  description: 'Bundle js and css from component exports',
  requires: ['noxt-plugin'],
}

export default mlm => {
  const styles = {};
  const scripts = {};
  return {
    'config.bundler': {
      is: {
        style: 'string|false',
        script: 'string|false',
      },
      default: {
        style: '_style',
        script: '_script',
      },
    },
    'services.bundler': () => ({ styles, scripts }),
    'registerComponent.bundler': async ({ name, component, module }) => {
      styles[component.name] = module.style ? `/* ${name} */ \n ${module.style}\n` : '';
      scripts[component.name] = module.script ? `/* ${name} */ \n ${module.script}\n` : '';
    },
    'middleware.bundler': () => {
      const router = mlm.services.express.Router();
      if (mlm.config.bundler.style) {
        router.get(`/${mlm.config.bundler.style}`, (req, res) => {
          res.logGroup = 'bundler';
          res.set('Content-Type', 'text/css');
          res.send( Object.values(styles).join('') );
        });
      }
      if (mlm.config.bundler.script) {
        router.get(`/${mlm.config.bundler.script}`, (req, res) => {
          res.logGroup = 'bundler';
          res.set('Content-Type', 'text/javascript');
          res.send( Object.values(scripts).join('') );
        });
      }
      return router
    }
  }
}