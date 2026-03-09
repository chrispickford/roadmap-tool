import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const client = {
  entryPoints: ['src/main.ts'],
  bundle:      true,
  minify:      !watch,
  sourcemap:   watch,
  outfile:     'public/js/app.js',
};

const server = {
  entryPoints: ['src/server.ts'],
  platform:    'node',
  bundle:      true,
  minify:      !watch,
  outfile:     'server.js',
};

if (watch) {
  const [clientCtx, serverCtx] = await Promise.all([
    esbuild.context(client),
    esbuild.context(server),
  ]);
  await Promise.all([clientCtx.watch(), serverCtx.watch()]);
  console.log('Watching for changes…');
} else {
  const results = await Promise.all([
    esbuild.build(client),
    esbuild.build(server),
  ]);
  results.forEach(r => r.errors.length && process.exit(1));
}
