import { fileURLToPath } from 'url';
import { dirname } from 'path';
import MLM from 'mlm-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function resolveModule(name) {
  if (!name.includes('/')) {
    return `${__dirname}/units/${name}.js`;
  }
  if (name.startsWith('app/')) {
    return `${process.cwd()}/units/${name.slice(4)}.js`;
  }
  if (name.startsWith('contrib/')) {
    const m = name.match(/^contrib\/([^/]+)(?:\/(.*))?$/);
    if (!m) throw new Error(`Invalid contrib module name: ${name}`);
    if (!m[2]) return `noxt-contrib-${m[1]}`;
    return `noxt-contrib-${m[1]}/${m[2]}`;
  }
  throw new Error(`Invalid module name: ${name}`);
}

export async function startServer({ config, recipe, import: _import}) {
 
  const beforeBoot = process.hrtime.bigint();
  const mlmInstance = await MLM({
    import: _import ?? (p => import(p)),
    resolveModule
  });
  try {
    const afterBoot = process.hrtime.bigint();
    const report = await mlmInstance.analyze(recipe ?? 'noxt-dev');
    if (!report.success) {
      console.log('Bad recipe: ' + recipe + '\n' + report.order.join(', '));
      console.log(report.errors.join('\n'));
      process.exit(1);
    }
    const afterAnalyze = process.hrtime.bigint();
    await mlmInstance.install(recipe ?? 'noxt-dev');
    const afterInstall = process.hrtime.bigint();
    const mlm = mlmInstance.context;
    await mlm.services.config.merge(config);
    const afterConfig = process.hrtime.bigint();
    await mlmInstance.start();
    const afterStart = process.hrtime.bigint();

    console.log(
      '[noxt-server] Total time', Number((afterStart - beforeBoot) / 1_000_000n), 'ms',
      '| Boot', Number((afterBoot - beforeBoot) / 1_000_000n), 'ms',
      '| Load', Number((afterAnalyze - afterBoot) / 1_000_000n), 'ms',
      '| Install', Number((afterInstall - afterAnalyze) / 1_000_000n), 'ms',
      '| Config', Number((afterConfig - afterInstall) / 1_000_000n), 'ms',
      '| Start', Number((afterStart - afterConfig) / 1_000_000n), 'ms',
    );

    mlmInstance.repl();
  } catch (e) {
    console.log(await mlmInstance.analyze(recipe ?? 'noxt-dev'));
    console.error(e);
    process.exit(1);
  }
}