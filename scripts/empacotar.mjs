// Empacota dist/ em predecessores-v{versão}.zip, com o manifest.json na raiz do zip,
// pronto para enviar à Chrome Web Store ou à Edge Add-ons. Node puro, sem dependências.
// Rode com: npm run zip  (faz o build antes)
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { deflateRawSync } from 'node:zlib';

const manifest = JSON.parse(readFileSync('dist/manifest.json', 'utf-8'));
const pacote = JSON.parse(readFileSync('package.json', 'utf-8'));
if (manifest.version !== pacote.version) {
  console.error(`Versões diferentes: manifest.json ${manifest.version} x package.json ${pacote.version}. Alinhe antes de empacotar.`);
  process.exit(1);
}
for (const lado of Object.keys(manifest.icons ?? {})) {
  statSync(join('dist', manifest.icons[lado])); // falha se o ícone não estiver no pacote
}

const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = TABELA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const arquivos = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? arquivos(join(dir, e.name)) : [join(dir, e.name)]));

// Data/hora DOS fixa (2026-01-01 00:00) para o zip sair igual a cada build.
const DOS_HORA = 0;
const DOS_DATA = ((2026 - 1980) << 9) | (1 << 5) | 1;

const locais = [];
const central = [];
let deslocamento = 0;
for (const caminho of arquivos('dist').sort()) {
  const nome = Buffer.from(relative('dist', caminho).split(sep).join('/'), 'utf-8');
  const dados = readFileSync(caminho);
  const comprimido = deflateRawSync(dados, { level: 9 });
  const crc = crc32(dados);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // versão necessária
  local.writeUInt16LE(0x0800, 6); // nomes em UTF-8
  local.writeUInt16LE(8, 8); // deflate
  local.writeUInt16LE(DOS_HORA, 10);
  local.writeUInt16LE(DOS_DATA, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(comprimido.length, 18);
  local.writeUInt32LE(dados.length, 22);
  local.writeUInt16LE(nome.length, 26);
  locais.push(local, nome, comprimido);

  const cab = Buffer.alloc(46);
  cab.writeUInt32LE(0x02014b50, 0);
  cab.writeUInt16LE(20, 4);
  cab.writeUInt16LE(20, 6);
  cab.writeUInt16LE(0x0800, 8);
  cab.writeUInt16LE(8, 10);
  cab.writeUInt16LE(DOS_HORA, 12);
  cab.writeUInt16LE(DOS_DATA, 14);
  cab.writeUInt32LE(crc, 16);
  cab.writeUInt32LE(comprimido.length, 20);
  cab.writeUInt32LE(dados.length, 24);
  cab.writeUInt16LE(nome.length, 28);
  cab.writeUInt32LE(deslocamento, 42);
  central.push(cab, nome);

  deslocamento += local.length + nome.length + comprimido.length;
}

const tamanhoCentral = central.reduce((s, b) => s + b.length, 0);
const fim = Buffer.alloc(22);
fim.writeUInt32LE(0x06054b50, 0);
fim.writeUInt16LE(central.length / 2, 8);
fim.writeUInt16LE(central.length / 2, 10);
fim.writeUInt32LE(tamanhoCentral, 12);
fim.writeUInt32LE(deslocamento, 16);

const saida = `predecessores-v${manifest.version}.zip`;
writeFileSync(saida, Buffer.concat([...locais, ...central, fim]));
console.log(`${saida} (${central.length / 2} arquivos)`);
