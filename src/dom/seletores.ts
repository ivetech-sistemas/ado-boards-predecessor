/**
 * Os ÚNICOS seletores da tela do Azure DevOps.
 *
 * O board e o taskboard usam a interface nova da Microsoft (React) e não oferecem API
 * para os cards. Quando a Microsoft mudar a tela, só este arquivo deve mudar.
 *
 * Como confirmar ou atualizar: abra o board, rode `scripts/diagnostico-seletores.js`
 * no console do DevTools e compare com as listas abaixo. A ordem importa: o primeiro
 * candidato que achar algo é o usado.
 */
import type { TipoDePagina } from '../api/base';

/** Classe do bloco que a extensão acrescenta (tudo dentro dele é nosso). */
export const CLASSE_DO_BLOCO = 'ivt-pred-bloco';
/** Marca do card decorado: data-ivt-pred="<id>:<hash>". */
export const ATRIBUTO_MARCA = 'data-ivt-pred';

export const SELETORES = {
  /** Card. Se um candidato casar com elementos aninhados, fica o mais interno. */
  card: {
    board: [
      '.wit-card',
      '[data-itemid]',
      '[data-item-id]',
      '[data-workitemid]',
      '[data-work-item-id]',
      '.board-tile',
      '.kanban-card',
    ],
    taskboard: [
      '.wit-card',
      '[data-itemid]',
      '[data-item-id]',
      '[data-workitemid]',
      '[data-work-item-id]',
      '.tbTile',
      '.taskboard-card',
      '[id^="tile-"]',
    ],
  },

  /**
   * Plano de reserva: a partir do link do work item, sobe até um elemento com cara de card.
   * Só é usado quando nenhum seletor de card acima acha nada.
   */
  linkDoWorkItem: 'a[href*="/_workitems/edit/"]',
  cardPeloLink: '[role="listitem"], [draggable="true"], [class*="card" i], [class*="tile" i]',

  /** De onde tirar o ID, na ordem. */
  atributosDeId: ['data-itemid', 'data-item-id', 'data-workitemid', 'data-work-item-id', 'data-id'],
  /** id="tile-123" (taskboard antigo). */
  padraoDoAtributoIdHtml: /^tile-(\d+)$/,
  /** Campo ID, quando visível no card. */
  campoId: ['.wit-card-id', '.id', '[class*="card-id" i]', '[class*="item-id" i]'],

  /**
   * Onde inserir o bloco, dentro do card. Sem match, vai no fim do próprio card.
   * Prefira o contêiner dos campos, para o bloco ficar abaixo deles e dentro da borda do card.
   */
  insercao: ['.wit-card-content', '.card-content', '.tbTileContent', '.board-tile-content'],
} as const;

export interface CardNaTela {
  el: HTMLElement;
  id: number;
}

function ehNosso(el: Element): boolean {
  return !!el.closest(`.${CLASSE_DO_BLOCO}`);
}

function primeiroQueCasa(raiz: ParentNode, seletores: readonly string[]): HTMLElement[] {
  for (const s of seletores) {
    let achados: HTMLElement[];
    try {
      achados = [...raiz.querySelectorAll<HTMLElement>(s)].filter((el) => !ehNosso(el));
    } catch {
      continue; // seletor inválido no navegador: ignora
    }
    if (achados.length > 0) return achados;
  }
  return [];
}

/** Remove os elementos que contêm outro elemento da lista (fica o mais interno). */
function soOsMaisInternos(els: HTMLElement[]): HTMLElement[] {
  const conjunto = new Set(els);
  return els.filter((el) => !els.some((outro) => outro !== el && el.contains(outro) && conjunto.has(outro)));
}

/** ID de um work item a partir do href de um link "/_workitems/edit/123". */
export function idDoLink(href: string | null | undefined): number | null {
  const m = /\/_workitems\/edit\/(\d+)/i.exec(href ?? '');
  return m ? Number(m[1]) : null;
}

function numero(valor: string | null | undefined): number | null {
  const t = (valor ?? '').trim();
  return /^\d+$/.test(t) ? Number(t) : null;
}

export function idDoCard(card: HTMLElement): number | null {
  for (const attr of SELETORES.atributosDeId) {
    const n = numero(card.getAttribute(attr));
    if (n !== null) return n;
  }

  const idHtml = SELETORES.padraoDoAtributoIdHtml.exec(card.id);
  if (idHtml) return Number(idHtml[1]);

  const ids = new Set<number>();
  for (const a of card.querySelectorAll<HTMLAnchorElement>(SELETORES.linkDoWorkItem)) {
    if (ehNosso(a)) continue;
    const n = idDoLink(a.getAttribute('href'));
    if (n !== null) ids.add(n);
  }
  if (ids.size === 1) return [...ids][0]!;

  for (const s of SELETORES.campoId) {
    for (const el of card.querySelectorAll<HTMLElement>(s)) {
      if (ehNosso(el)) continue;
      const n = numero(el.textContent);
      if (n !== null) return n;
    }
  }
  return null;
}

/** Cards da página com o ID de cada um. Card sem ID reconhecível fica de fora. */
export function acharCards(raiz: ParentNode, tipo: TipoDePagina): CardNaTela[] {
  let candidatos = soOsMaisInternos(primeiroQueCasa(raiz, SELETORES.card[tipo]));

  if (candidatos.length === 0) {
    const pelosLinks = new Set<HTMLElement>();
    for (const a of raiz.querySelectorAll<HTMLElement>(SELETORES.linkDoWorkItem)) {
      if (ehNosso(a)) continue;
      const card = a.closest<HTMLElement>(SELETORES.cardPeloLink);
      if (card) pelosLinks.add(card);
    }
    candidatos = soOsMaisInternos([...pelosLinks]);
  }

  const cards: CardNaTela[] = [];
  for (const el of candidatos) {
    const id = idDoCard(el);
    if (id !== null) cards.push({ el, id });
  }
  return cards;
}

/** Card que contém o elemento (usado para saber qual card o usuário arrastou). */
export function cardDoElemento(el: Element | null, tipo: TipoDePagina): HTMLElement | null {
  if (!el || ehNosso(el)) return null;
  for (const s of [...SELETORES.card[tipo], SELETORES.cardPeloLink]) {
    try {
      const card = el.closest<HTMLElement>(s);
      if (card) return card;
    } catch {
      /* seletor inválido: tenta o próximo */
    }
  }
  return null;
}

/** Onde acrescentar o bloco dentro do card. */
export function pontoDeInsercao(card: HTMLElement): HTMLElement {
  for (const s of SELETORES.insercao) {
    const el = card.querySelector<HTMLElement>(s);
    if (el && !ehNosso(el)) return el;
  }
  return card;
}

/** Bloco já desenhado neste card, se houver. */
export function blocoDoCard(card: HTMLElement): HTMLElement | null {
  return card.querySelector<HTMLElement>(`.${CLASSE_DO_BLOCO}`);
}
