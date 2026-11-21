/**
 * Funções puras: relações, filtro de concluídos, corte em N linhas e hash.
 * Nada aqui toca o DOM nem a rede.
 */

export const REL_PREDECESSOR = 'System.LinkTypes.Dependency-Reverse';

export interface Relacao {
  rel: string;
  url: string;
}

export interface EstadoDoTipo {
  name: string;
  /** Cor com "#", ex.: "#007acc". */
  color: string;
  /** Proposed, InProgress, Resolved, Completed, Removed... */
  category: string;
}

export interface Pessoa {
  nome: string;
  avatarUrl?: string;
}

/** Predecessor como a tela precisa dele. */
export interface Predecessor {
  id: number;
  /** false quando a API omitiu o item (sem permissão de leitura ou excluído). */
  acessivel: boolean;
  titulo?: string;
  tipo?: string;
  estado?: string;
  projeto?: string;
  responsavel?: Pessoa;
}

/** IDs dos predecessores (link "Predecessor" da tela), sem repetição e na ordem das relações. */
export function extrairPredecessores(relations: readonly Relacao[] | null | undefined): number[] {
  if (!relations) return [];
  const ids: number[] = [];
  for (const r of relations) {
    if (r?.rel !== REL_PREDECESSOR || typeof r.url !== 'string') continue;
    const id = idDaUrl(r.url);
    if (id !== null && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** ID no fim da url da relação: .../_apis/wit/workItems/123 */
export function idDaUrl(url: string): number | null {
  const m = /\/workitems\/(\d+)\/?(?:[?#].*)?$/i.exec(url);
  return m ? Number(m[1]) : null;
}

const CATEGORIAS_CONCLUIDAS = new Set(['completed', 'removed']);

/**
 * Verdadeiro quando o estado está na categoria Completed ou Removed no processo do tipo.
 * Não compara com o nome ("Done", "Closed", "Concluído"...), que muda por processo e idioma.
 * Estado desconhecido conta como aberto: na dúvida, mostrar.
 */
export function estaConcluido(estado: string | undefined, estados: readonly EstadoDoTipo[] | undefined): boolean {
  if (!estado || !estados) return false;
  const alvo = estado.toLowerCase();
  const encontrado = estados.find((e) => e.name.toLowerCase() === alvo);
  return encontrado ? CATEGORIAS_CONCLUIDAS.has(encontrado.category.toLowerCase()) : false;
}

export function corDoEstado(estado: string | undefined, estados: readonly EstadoDoTipo[] | undefined): string | undefined {
  if (!estado || !estados) return undefined;
  const alvo = estado.toLowerCase();
  return estados.find((e) => e.name.toLowerCase() === alvo)?.color;
}

/** Normaliza a cor da API ("007acc", "#007acc", "ff007acc") para "#rrggbb". */
export function normalizarCor(cor: string | undefined | null): string {
  const limpa = (cor ?? '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{8}$/i.test(limpa)) return `#${limpa.slice(2)}`; // ARGB
  if (/^[0-9a-f]{6}$/i.test(limpa) || /^[0-9a-f]{3}$/i.test(limpa)) return `#${limpa}`;
  return '#b2b2b2';
}

export interface Corte<T> {
  visiveis: T[];
  restantes: T[];
}

/** Até `max` linhas de predecessor; o que passar vira o "+K" (`restantes`). */
export function cortarLinhas<T>(itens: readonly T[], max: number): Corte<T> {
  const limite = Number.isFinite(max) ? Math.max(1, Math.floor(max)) : 3;
  return { visiveis: itens.slice(0, limite), restantes: itens.slice(limite) };
}

/** Iniciais para o avatar sem foto: "Maria da Silva" -> "MS". */
export function iniciais(nome: string | undefined): string {
  const limpo = (nome ?? '').replace(/<[^>]*>/g, '').trim();
  if (!limpo) return '?';
  const partes = limpo.split(/\s+/).filter((p) => /^[\p{L}\p{N}]/u.test(p));
  if (partes.length === 0) return limpo.charAt(0).toUpperCase();
  const primeira = partes[0]!.charAt(0);
  const ultima = partes.length > 1 ? partes[partes.length - 1]!.charAt(0) : '';
  return (primeira + ultima).toUpperCase();
}

/** Hash curto e estável (djb2) para marcar o card decorado. */
export function hash(texto: string): string {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) {
    h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

/** Valor de data-ivt-pred: "<id>:<hash do que foi desenhado>". */
export function marcaDoCard(idDoCard: number, conteudo: unknown): string {
  return `${idDoCard}:${hash(JSON.stringify(conteudo))}`;
}

/** Divide uma lista em lotes de até `tamanho`. */
export function emLotes<T>(itens: readonly T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}
