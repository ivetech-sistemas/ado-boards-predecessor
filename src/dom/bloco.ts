/**
 * Monta o bloco de linhas de predecessores. DOM puro, sem framework.
 *
 *   [←] (●) (foto) Título do predecessor, cortado em uma linha…
 */
import { iniciais, type Pessoa } from '../dominio/predecessores';
import { CLASSE_DO_BLOCO } from './seletores';

export interface LinhaDoBloco {
  id: number;
  acessivel: boolean;
  titulo?: string;
  tipo?: string;
  estado?: string;
  /** "#rrggbb" */
  cor?: string;
  responsavel?: Pessoa;
  /** Link do predecessor. Sem link (sem acesso), a linha não é clicável. */
  url?: string;
}

export type Abridor = (url: string, novaAba: boolean) => void;

export interface OpcoesDoBloco {
  abrirEmNovaAba: boolean;
  /** Injetável para teste. Padrão: window.open / location.assign. */
  abrir?: Abridor;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export const abrirPadrao: Abridor = (url, novaAba) => {
  if (novaAba) window.open(url, '_blank', 'noopener');
  else window.location.assign(url);
};

function seta(doc: Document): SVGSVGElement {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'ivt-pred-seta');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = doc.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M7.2 2.6 1.8 8l5.4 5.4 1-1L4.5 8.7H14V7.3H4.5l3.7-3.7z');
  path.setAttribute('fill', 'currentColor');
  svg.appendChild(path);
  return svg;
}

function span(doc: Document, classe: string, texto?: string): HTMLSpanElement {
  const el = doc.createElement('span');
  el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function avatarComIniciais(doc: Document, pessoa: Pessoa): HTMLSpanElement {
  const el = span(doc, 'ivt-pred-avatar ivt-pred-iniciais', iniciais(pessoa.nome));
  el.title = pessoa.nome;
  return el;
}

function avatar(doc: Document, pessoa: Pessoa | undefined): HTMLElement {
  if (!pessoa) {
    const vazio = span(doc, 'ivt-pred-avatar ivt-pred-sem-responsavel');
    vazio.setAttribute('aria-hidden', 'true');
    return vazio;
  }
  if (!pessoa.avatarUrl) return avatarComIniciais(doc, pessoa);

  const img = doc.createElement('img');
  img.className = 'ivt-pred-avatar';
  img.src = pessoa.avatarUrl;
  img.alt = pessoa.nome;
  img.title = pessoa.nome;
  img.width = 16;
  img.height = 16;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.draggable = false;
  img.referrerPolicy = 'same-origin';
  // Sem foto (404, sem permissão): troca pelas iniciais.
  img.addEventListener('error', () => img.replaceWith(avatarComIniciais(doc, pessoa)), { once: true });
  return img;
}

export function textoDoTooltip(linha: LinhaDoBloco): string {
  if (!linha.acessivel) return `#${linha.id} (sem permissão de leitura)`;
  const tipo = linha.tipo ? ` ${linha.tipo}` : '';
  return `#${linha.id}${tipo} — ${linha.titulo ?? ''}`.trim();
}

function linhaSemAcesso(doc: Document, linha: LinhaDoBloco): HTMLElement {
  const el = doc.createElement('div');
  el.className = 'ivt-pred-linha ivt-pred-sem-acesso';
  el.title = textoDoTooltip(linha);
  el.appendChild(seta(doc));
  el.appendChild(span(doc, 'ivt-pred-titulo', `#${linha.id}`));
  return el;
}

function linhaComDados(doc: Document, linha: LinhaDoBloco): HTMLElement {
  const el = doc.createElement(linha.url ? 'a' : 'div');
  el.className = 'ivt-pred-linha';
  el.setAttribute('data-ivt-pred-id', String(linha.id));
  if (linha.url) {
    el.setAttribute('href', linha.url);
    el.setAttribute('draggable', 'false');
    el.setAttribute('data-ivt-pred-url', linha.url);
    el.setAttribute('aria-label', `Predecessor ${textoDoTooltip(linha)}${linha.estado ? `, estado ${linha.estado}` : ''}`);
  }

  el.appendChild(seta(doc));

  const estado = span(doc, 'ivt-pred-estado');
  estado.style.backgroundColor = linha.cor ?? '#b2b2b2';
  estado.title = `Estado: ${linha.estado ?? 'desconhecido'}`;
  el.appendChild(estado);

  el.appendChild(avatar(doc, linha.responsavel));

  const titulo = span(doc, 'ivt-pred-titulo', linha.titulo ?? `#${linha.id}`);
  titulo.title = textoDoTooltip(linha);
  el.appendChild(titulo);

  return el;
}

function linhaMais(doc: Document, restantes: readonly LinhaDoBloco[]): HTMLElement {
  const el = doc.createElement('div');
  el.className = 'ivt-pred-linha ivt-pred-mais';
  el.textContent = `+${restantes.length}`;
  el.title = restantes.map(textoDoTooltip).join('\n');
  return el;
}

/**
 * Isola o bloco do card: nenhum clique, toque ou tecla do bloco pode abrir o card
 * ou iniciar o arrastar (RF7). O clique numa linha com link abre o predecessor.
 */
function isolarEventos(bloco: HTMLElement, opcoes: OpcoesDoBloco): void {
  const abrir = opcoes.abrir ?? abrirPadrao;
  const linkDoEvento = (e: Event) =>
    (e.target as Element | null)?.closest?.<HTMLElement>('[data-ivt-pred-url]')?.getAttribute('data-ivt-pred-url') ?? null;

  const parar = (e: Event) => e.stopPropagation();
  const pararEImpedir = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
  };

  // pointerdown com preventDefault também suprime o mousedown de compatibilidade.
  for (const tipo of ['pointerdown', 'mousedown', 'dragstart']) bloco.addEventListener(tipo, pararEImpedir);
  for (const tipo of ['pointerup', 'mouseup', 'dblclick', 'contextmenu']) bloco.addEventListener(tipo, parar);
  bloco.addEventListener('touchstart', parar, { passive: true });

  bloco.addEventListener('click', (e) => {
    pararEImpedir(e);
    const url = linkDoEvento(e);
    if (url) abrir(url, opcoes.abrirEmNovaAba || e.ctrlKey || e.metaKey || e.shiftKey);
  });

  // Botão do meio: sempre em nova aba.
  bloco.addEventListener('auxclick', (e) => {
    pararEImpedir(e);
    const url = linkDoEvento(e);
    if (url && e.button === 1) abrir(url, true);
  });

  // Enter no link vira click (tratado acima); aqui só não deixa a tecla chegar ao card.
  bloco.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
  });
}

export function montarBloco(
  doc: Document,
  visiveis: readonly LinhaDoBloco[],
  restantes: readonly LinhaDoBloco[],
  opcoes: OpcoesDoBloco,
): HTMLElement {
  const bloco = doc.createElement('div');
  bloco.className = CLASSE_DO_BLOCO;
  bloco.setAttribute('role', 'group');
  bloco.setAttribute('aria-label', 'Predecessores em aberto');

  for (const linha of visiveis) {
    bloco.appendChild(linha.acessivel ? linhaComDados(doc, linha) : linhaSemAcesso(doc, linha));
  }
  if (restantes.length > 0) bloco.appendChild(linhaMais(doc, restantes));

  isolarEventos(bloco, opcoes);
  return bloco;
}
