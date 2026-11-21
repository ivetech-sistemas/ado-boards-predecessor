// Gera as imagens do README em docs/imagens/ com o Edge (ou Chrome) em modo headless.
//
// As cenas usam o código real da extensão (scripts/capturas/demo.ts) sobre uma reprodução
// simplificada do card do Azure DevOps, com dados fictícios. A página de opções é a real (dist/).
//
// Rode com: npm run capturas
// Navegador: variável NAVEGADOR, ou o Edge/Chrome no caminho padrão do Windows, macOS ou Linux.
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CANDIDATOS = [
  process.env.NAVEGADOR,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/microsoft-edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const navegador = CANDIDATOS.find((c) => existsSync(c));
if (!navegador) {
  console.error('Edge ou Chrome não encontrado. Defina a variável NAVEGADOR com o caminho do executável.');
  process.exit(1);
}

const SAIDA = resolve('docs/imagens');
const TEMP = resolve('dist-capturas');
/** Espera síncrona curta (o Edge entrega o trabalho a um processo filho e sai na hora). */
const dormir = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const removerSemFalhar = (caminho) => {
  try {
    rmSync(caminho, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  } catch {
    /* processo do navegador ainda segurando o perfil: fica para a próxima execução */
  }
};

/** Espera o arquivo existir e o tamanho parar de mudar. */
function esperarArquivo(caminho, limiteMs = 30_000) {
  const fim = Date.now() + limiteMs;
  let anterior = -1;
  while (Date.now() < fim) {
    if (existsSync(caminho)) {
      const tamanho = statSync(caminho).size;
      if (tamanho > 0 && tamanho === anterior) return true;
      anterior = tamanho;
    }
    dormir(300);
  }
  return existsSync(caminho);
}

removerSemFalhar(TEMP);
mkdirSync(TEMP, { recursive: true });
mkdirSync(SAIDA, { recursive: true });

await build({
  entryPoints: ['scripts/capturas/demo.ts'],
  outfile: join(TEMP, 'demo.js'),
  bundle: true,
  format: 'iife',
  target: 'chrome111',
  logLevel: 'warning',
});
cpSync('scripts/capturas/demo.html', join(TEMP, 'demo.html'));
cpSync('src/estilos.css', join(TEMP, 'estilos.css'));

if (!existsSync('dist/opcoes.html')) {
  console.error('dist/ não existe. Rode "npm run build" antes.');
  process.exit(1);
}

const demo = (consulta) => `${pathToFileURL(join(TEMP, 'demo.html')).href}?${consulta}`;
const CLARO = '--blink-settings=preferredColorScheme=1';
const ESCURO = '--blink-settings=preferredColorScheme=0';
const opcoes = pathToFileURL(resolve('dist/opcoes.html')).href;
// O navegador headless tem largura mínima de ~500 px: janelas mais estreitas saem cortadas.
// O zoom de 2x do close-up é feito no CSS da demo (zoom), não com --force-device-scale-factor,
// que no modo headless desloca o enquadramento e corta a imagem.
const CENAS = [
  { arquivo: 'board-claro.png', url: demo('cena=board&tema=claro'), largura: 1280, altura: 560 },
  { arquivo: 'board-escuro.png', url: demo('cena=board&tema=escuro'), largura: 1280, altura: 560 },
  { arquivo: 'taskboard-claro.png', url: demo('cena=taskboard&tema=claro'), largura: 1280, altura: 460 },
  { arquivo: 'card-detalhe.png', url: demo('cena=card&tema=claro'), largura: 720, altura: 520 },
  { arquivo: 'card-detalhe-escuro.png', url: demo('cena=card&tema=escuro'), largura: 720, altura: 520 },
  { arquivo: 'opcoes-claro.png', url: opcoes, largura: 520, altura: 470, extras: [CLARO] },
  { arquivo: 'opcoes-escuro.png', url: opcoes, largura: 520, altura: 470, extras: [ESCURO] },
];

for (const [n, cena] of CENAS.entries()) {
  const destino = join(SAIDA, cena.arquivo);
  rmSync(destino, { force: true });
  const r = spawnSync(
    navegador,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      `--user-data-dir=${join(TEMP, `perfil-${n}`)}`,
      `--window-size=${cena.largura},${cena.altura}`,
      ...(cena.extras ?? []),
      '--virtual-time-budget=3000',
      `--screenshot=${destino}`,
      cena.url,
    ],
    { stdio: 'ignore', timeout: 60_000 },
  );
  if (!esperarArquivo(destino)) {
    console.error(`Falhou: ${cena.arquivo} (status ${r.status ?? r.error})`);
    process.exitCode = 1;
    continue;
  }
  console.log(`docs/imagens/${cena.arquivo}`);
}

dormir(1500);
removerSemFalhar(TEMP);
