// Gera icons/icon{16,32,48,128}.png em Node puro (sem dependências).
// Desenho: quadrado azul arredondado com a seta "depende de" e a bolinha de estado, em branco,
// o mesmo vocabulário visual das linhas do card.
// Rode com: node scripts/gerar-icones.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const AZUL = [0x00, 0x78, 0xd4];
const BRANCO = [0xff, 0xff, 0xff];
const AMOSTRAS = 4; // supersampling 4x4 para suavizar as bordas

// --- PNG mínimo (RGBA 8 bits) -------------------------------------------------
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
const bloco = (tipo, dados) => {
  const tam = Buffer.alloc(4);
  tam.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tam, corpo, crc]);
};
function png(lado, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8; // bits
  ihdr[9] = 6; // RGBA
  const linhas = Buffer.alloc(lado * (lado * 4 + 1));
  for (let y = 0; y < lado; y++) {
    linhas[y * (lado * 4 + 1)] = 0; // filtro "none"
    rgba.copy(linhas, y * (lado * 4 + 1) + 1, y * lado * 4, (y + 1) * lado * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', deflateSync(linhas, { level: 9 })),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

// --- Formas, em coordenadas 0..1 da área do desenho --------------------------
const dentroRetanguloArredondado = (x, y, r) => {
  const cx = Math.min(Math.max(x, r), 1 - r);
  const cy = Math.min(Math.max(y, r), 1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
const dentroTriangulo = (x, y, [ax, ay], [bx, by], [cx, cy]) => {
  const s = (px, py, qx, qy, rx, ry) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
  const d1 = s(x, y, ax, ay, bx, by);
  const d2 = s(x, y, bx, by, cx, cy);
  const d3 = s(x, y, cx, cy, ax, ay);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};
function corEm(x, y) {
  if (!dentroRetanguloArredondado(x, y, 0.22)) return null;
  const seta =
    dentroTriangulo(x, y, [0.16, 0.5], [0.44, 0.27], [0.44, 0.73]) || // ponta
    (x >= 0.4 && x <= 0.6 && y >= 0.435 && y <= 0.565); // haste
  const bolinha = (x - 0.75) ** 2 + (y - 0.5) ** 2 <= 0.105 ** 2;
  return seta || bolinha ? BRANCO : AZUL;
}

function icone(lado) {
  // 128: arte de 96x96 com 16 px de margem transparente (orientação da Chrome Web Store).
  const margem = lado === 128 ? 16 : Math.max(1, Math.round(lado / 16));
  const area = lado - 2 * margem;
  const rgba = Buffer.alloc(lado * lado * 4);
  for (let py = 0; py < lado; py++) {
    for (let px = 0; px < lado; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < AMOSTRAS; sy++) {
        for (let sx = 0; sx < AMOSTRAS; sx++) {
          const x = (px + (sx + 0.5) / AMOSTRAS - margem) / area;
          const y = (py + (sy + 0.5) / AMOSTRAS - margem) / area;
          const cor = x >= 0 && x <= 1 && y >= 0 && y <= 1 ? corEm(x, y) : null;
          if (cor) {
            r += cor[0];
            g += cor[1];
            b += cor[2];
            a++;
          }
        }
      }
      const i = (py * lado + px) * 4;
      if (a > 0) {
        rgba[i] = Math.round(r / a);
        rgba[i + 1] = Math.round(g / a);
        rgba[i + 2] = Math.round(b / a);
      }
      rgba[i + 3] = Math.round((a / (AMOSTRAS * AMOSTRAS)) * 255);
    }
  }
  return png(lado, rgba);
}

mkdirSync('icons', { recursive: true });
for (const lado of [16, 32, 48, 128]) {
  writeFileSync(`icons/icon${lado}.png`, icone(lado));
  console.log(`icons/icon${lado}.png`);
}
