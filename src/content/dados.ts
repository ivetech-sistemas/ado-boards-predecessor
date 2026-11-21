/**
 * Cache em memória por ID (com validade) e montagem das linhas de cada card.
 * Não toca o DOM: recebe um Buscador, então dá para testar com respostas falsas.
 */
import { linkDoWorkItem } from '../api/base';
import { criarCacheDeEstados } from '../api/estados';
import type { Buscador } from '../api/http';
import { buscarCards, buscarPredecessores, type InfoDoCard } from '../api/workitems';
import type { LinhaDoBloco } from '../dom/bloco';
import { corDoEstado, cortarLinhas, estaConcluido, type Corte, type Predecessor } from '../dominio/predecessores';

interface Entrada<T> {
  valor: T;
  em: number;
}

export interface OpcoesDasLinhas {
  maxLinhas: number;
  esconderEmCardConcluido: boolean;
}

export function criarRepositorio(buscar: Buscador, agora: () => number = Date.now) {
  const cards = new Map<number, Entrada<InfoDoCard>>();
  const predecessores = new Map<number, Entrada<Predecessor>>();
  const estados = criarCacheDeEstados(buscar);

  const valido = (e: Entrada<unknown> | undefined, validadeMs: number) => !!e && agora() - e.em < validadeMs;

  /**
   * Garante no cache os cards, os predecessores deles e os estados dos tipos envolvidos.
   * Só vai à rede pelo que falta ou venceu, em lotes de até 200 IDs.
   * Erro de rede sobe (o chamador registra e não desenha).
   */
  async function carregar(base: string, idsDosCards: readonly number[], validadeMs: number): Promise<void> {
    const ids = [...new Set(idsDosCards)];

    const cardsVencidos = ids.filter((id) => !valido(cards.get(id), validadeMs));
    if (cardsVencidos.length > 0) {
      const achados = await buscarCards(buscar, base, cardsVencidos);
      const em = agora();
      for (const id of cardsVencidos) {
        // Card omitido pela API: guarda vazio para não pedir de novo a cada passada.
        cards.set(id, { valor: achados.get(id) ?? { id, predecessores: [] }, em });
      }
    }

    const idsDosPredecessores = [...new Set(ids.flatMap((id) => cards.get(id)?.valor.predecessores ?? []))];
    const predsVencidos = idsDosPredecessores.filter((id) => !valido(predecessores.get(id), validadeMs));
    if (predsVencidos.length > 0) {
      const achados = await buscarPredecessores(buscar, base, predsVencidos);
      const em = agora();
      for (const [id, p] of achados) predecessores.set(id, { valor: p, em });
    }

    const pares = [
      ...ids.map((id) => cards.get(id)?.valor),
      ...idsDosPredecessores.map((id) => predecessores.get(id)?.valor),
    ].filter((x): x is InfoDoCard | Predecessor => !!x);
    await estados.garantir(base, pares);
  }

  /**
   * Linhas do card a partir do cache.
   * `null` quando faltam dados (ex.: a busca falhou): o chamador não mexe no card.
   * Corte vazio quando não há nada a mostrar (sem predecessor aberto, ou card concluído).
   */
  function linhasDoCard(
    idDoCard: number,
    base: string,
    projetoDaPagina: string | undefined,
    opcoes: OpcoesDasLinhas,
  ): Corte<LinhaDoBloco> | null {
    const card = cards.get(idDoCard)?.valor;
    if (!card) return null;

    if (opcoes.esconderEmCardConcluido && estaConcluido(card.estado, estados.obter(card.projeto, card.tipo))) {
      return { visiveis: [], restantes: [] };
    }

    const linhas: LinhaDoBloco[] = [];
    for (const id of card.predecessores) {
      const p = predecessores.get(id)?.valor;
      if (!p) return null;
      if (!p.acessivel) {
        linhas.push({ id, acessivel: false });
        continue;
      }
      const estadosDoTipo = estados.obter(p.projeto, p.tipo);
      if (estaConcluido(p.estado, estadosDoTipo)) continue;
      const projeto = p.projeto ?? card.projeto ?? projetoDaPagina;
      linhas.push({
        id,
        acessivel: true,
        titulo: p.titulo,
        tipo: p.tipo,
        estado: p.estado,
        cor: corDoEstado(p.estado, estadosDoTipo),
        responsavel: p.responsavel,
        url: projeto ? linkDoWorkItem(base, projeto, id) : undefined,
      });
    }
    return cortarLinhas(linhas, opcoes.maxLinhas);
  }

  /** Esquece o card (ex.: acabou de ser arrastado para outra coluna). */
  function invalidarCard(id: number): void {
    cards.delete(id);
  }

  /** Esquece tudo o que vence (cards e predecessores). Os estados não vencem. */
  function limpar(): void {
    cards.clear();
    predecessores.clear();
  }

  return { carregar, linhasDoCard, invalidarCard, limpar };
}

export type Repositorio = ReturnType<typeof criarRepositorio>;
