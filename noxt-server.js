import { fileURLToPath } from 'url';
import { dirname } from 'path';
import MLM from 'mlm-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function startServer({ config, recipe }) {
 
  const mlmInstance = MLM({
    import:
      p => import(p),
    resolveModule:
      name => name.startsWith('app/')
        ? `${process.cwd()}/units/${name.slice(4)}.js`
        : `${__dirname}/units/${name}.js`
  });
  try {

    const report = await mlmInstance.analyze(recipe ?? 'noxt-dev');
    if (!report.success) {
      console.log('Bad recipe: ' + recipe + '\n' + report.order.join(', '));
      console.log(report.errors.join('\n'));
      process.exit(1);
    }
    
    await mlmInstance.install(recipe ?? 'noxt-dev');
    const mlm = mlmInstance.context;
    await mlm.services.config.merge(config);
    console.log(mlm.config);
    mlmInstance.start();

    mlmInstance.repl();
  } catch (e) {
    console.log(await mlmInstance.analyze(recipe ?? 'noxt-dev'));
    console.error(e);
    process.exit(1);
  }
}