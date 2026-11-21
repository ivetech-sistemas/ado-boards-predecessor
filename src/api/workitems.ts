/**
 * Lotes de links (relations) e de campos dos work items.
 * O `fields` não combina com o `$expand`, por isso são duas chamadas.
 */
import type { Buscador } from './http';
import { emLotes, extrairPredecessores, type Pessoa, type Predecessor, type Relacao } from '../dominio/predecessores';

export const TAMANHO_DO_LOTE = 200;
const API_VERSION = '7.1';

const CAMPOS_DO_PREDECESSOR = [
  'System.Id',
  'System.Title',
  'System.State',
  'System.WorkItemType',
  'System.AssignedTo',
  'System.TeamProject',
];

interface IdentidadeApi {
  displayName?: string;
  uniqueName?: string;
  imageUrl?: string;
  _links?: { avatar?: { href?: string } };
}

interface WorkItemApi {
  id: number;
  fields?: Record<string, unknown>;
  relations?: Relacao[] | null;
}

interface ListaApi {
  value?: Array<WorkItemApi | null>;
}

/** O que precisamos do card: estado (para o RF9) e os IDs dos predecessores. */
export interface InfoDoCard {
  id: number;
  estado?: string;
  tipo?: string;
  projeto?: string;
  predecessores: number[];
}

export function urlDasRelacoes(base: string, ids: readonly number[]): string {
  return `${base}/_apis/wit/workitems?ids=${ids.join(',')}&$expand=relations&errorPolicy=omit&api-version=${API_VERSION}`;
}

export function urlDosCampos(base: string, ids: readonly number[]): string {
  return `${base}/_apis/wit/workitems?ids=${ids.join(',')}&fields=${CAMPOS_DO_PREDECESSOR.join(',')}&errorPolicy=omit&api-version=${API_VERSION}`;
}

function texto(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function itensValidos(resposta: unknown): WorkItemApi[] {
  const lista = (resposta as ListaApi | null)?.value;
  if (!Array.isArray(lista)) return [];
  return lista.filter((w): w is WorkItemApi => !!w && typeof w.id === 'number');
}

/** Card -> estado e predecessores. Card omitido pela API (sem acesso) fica fora do mapa. */
export async function buscarCards(buscar: Buscador, base: string, ids: readonly number[]): Promise<Map<number, InfoDoCard>> {
  const resultado = new Map<number, InfoDoCard>();
  const respostas = await Promise.all(emLotes(ids, TAMANHO_DO_LOTE).map((lote) => buscar(urlDasRelacoes(base, lote))));
  for (const resposta of respostas) {
    for (const w of itensValidos(resposta)) {
      resultado.set(w.id, {
        id: w.id,
        estado: texto(w.fields?.['System.State']),
        tipo: texto(w.fields?.['System.WorkItemType']),
        projeto: texto(w.fields?.['System.TeamProject']),
        predecessores: extrairPredecessores(w.relations),
      });
    }
  }
  return resultado;
}

export function pessoaDaIdentidade(valor: unknown): Pessoa | undefined {
  if (!valor) return undefined;
  if (typeof valor === 'string') {
    // Formato antigo: "Nome <dominio\\usuario>"
    const nome = valor.replace(/\s*<[^>]*>\s*$/, '').trim();
    return nome ? { nome } : undefined;
  }
  const id = valor as IdentidadeApi;
  const nome = id.displayName || id.uniqueName;
  if (!nome) return undefined;
  return { nome, avatarUrl: id._links?.avatar?.href || id.imageUrl || undefined };
}

/**
 * Dados dos predecessores. Todo ID pedido volta no mapa: o que a API omitiu
 * (sem permissão de leitura) volta com `acessivel: false` (RF10).
 */
export async function buscarPredecessores(buscar: Buscador, base: string, ids: readonly number[]): Promise<Map<number, Predecessor>> {
  const resultado = new Map<number, Predecessor>();
  const respostas = await Promise.all(emLotes(ids, TAMANHO_DO_LOTE).map((lote) => buscar(urlDosCampos(base, lote))));
  for (const resposta of respostas) {
    for (const w of itensValidos(resposta)) {
      const f = w.fields ?? {};
      resultado.set(w.id, {
        id: w.id,
        acessivel: true,
        titulo: texto(f['System.Title']),
        tipo: texto(f['System.WorkItemType']),
        estado: texto(f['System.State']),
        projeto: texto(f['System.TeamProject']),
        responsavel: pessoaDaIdentidade(f['System.AssignedTo']),
      });
    }
  }
  for (const id of ids) {
    if (!resultado.has(id)) resultado.set(id, { id, acessivel: false });
  }
  return resultado;
}
