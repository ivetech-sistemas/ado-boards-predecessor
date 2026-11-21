// Gera dist/ pronto para "Carregar sem compactação" no Edge ou no Chrome.
import { build, context } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';

const watch = process.argv.includes('--watch');

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });

const copiar = () => {
  cpSync('manifest.json', 'dist/manifest.json');
  cpSync('src/estilos.css', 'dist/estilos.css');
  cpSync('src/opcoes/opcoes.html', 'dist/opcoes.html');
  cpSync('icons', 'dist/icons', { recursive: true });
};

const config = {
  entryPoints: {
    content: 'src/content/index.ts',
    opcoes: 'src/opcoes/pagina.ts',
  },
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  target: 'chrome111',
  legalComments: 'none',
  logLevel: 'info',
  plugins: [
    {
      name: 'copiar-estaticos',
      setup(b) {
        b.onEnd(() => copiar());
      },
    },
  ],
};

if (watch) {
  const ctx = await context({ ...config, sourcemap: 'inline' });
  await ctx.watch();
  console.log('Observando mudanças em src/...');
} else {
  await build(config);
}
