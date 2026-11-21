/**
 * Estados do tipo de work item (cor e categoria), em cache por projeto e tipo
 * enquanto a página estiver aberta.
 */
import type { Buscador } from './http';
import { normalizarCor, type EstadoDoTipo } from '../dominio/predecessores';

interface EstadosApi {
  value?: Array<{ name?: string; color?: string; category?: string }>;
}

export function urlDosEstados(base: string, projeto: string, tipo: string): string {
  return `${base}/${encodeURIComponent(projeto)}/_apis/wit/workitemtypes/${encodeURIComponent(tipo)}/states?api-version=7.1`;
}

export function lerEstados(resposta: unknown): EstadoDoTipo[] {
  return ((resposta as EstadosApi | null)?.value ?? [])
    .filter((e) => typeof e?.name === 'string')
    .map((e) => ({ name: e.name!, color: normalizarCor(e.color), category: e.category ?? '' }));
}

export interface ParTipo {
  projeto?: string;
  tipo?: string;
}

export function criarCacheDeEstados(buscar: Buscador) {
  /** Estados carregados. Não vencem enquanto a página estiver aberta. */
  const carregados = new Map<string, EstadoDoTipo[]>();
  const chave = (projeto: string, tipo: string) => `${projeto.toLowerCase()}|${tipo.toLowerCase()}`;

  /** Estados já carregados, sem rede. */
  function obter(projeto: string | undefined, tipo: string | undefined): EstadoDoTipo[] | undefined {
    return projeto && tipo ? carregados.get(chave(projeto, tipo)) : undefined;
  }

  /**
   * Carrega os pares (projeto, tipo) que faltam. A falha de um par só registra um aviso
   * e não derruba os outros (tenta de novo na próxima passada). Sessão vencida sobe.
   */
  async function garantir(base: string, pares: Iterable<ParTipo>): Promise<void> {
    const pendentes = new Map<string, { projeto: string; tipo: string }>();
    for (const { projeto, tipo } of pares) {
      if (!projeto || !tipo) continue;
      const k = chave(projeto, tipo);
      if (!carregados.has(k)) pendentes.set(k, { projeto, tipo });
    }
    await Promise.all(
      [...pendentes].map(async ([k, { projeto, tipo }]) => {
        try {
          carregados.set(k, lerEstados(await buscar(urlDosEstados(base, projeto, tipo))));
        } catch (e) {
          if ((e as Error)?.name === 'SessaoVencida') throw e;
          console.warn('[predecessores] não foi possível ler os estados de', tipo, 'em', projeto, e);
        }
      }),
    );
  }

  return { garantir, obter };
}

export type CacheDeEstados = ReturnType<typeof criarCacheDeEstados>;
