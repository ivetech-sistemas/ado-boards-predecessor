/**
 * Content script: detecta a página, observa a tela e coordena busca e desenho.
 * Falha em silêncio (RF11): nenhum erro daqui pode quebrar o board.
 */
import { colecaoDaUrl, tipoDePagina, type TipoDePagina } from '../api/base';
import { buscarJson } from '../api/http';
import { montarBloco } from '../dom/bloco';
import {
  acharCards,
  ATRIBUTO_MARCA,
  blocoDoCard,
  cardDoElemento,
  CLASSE_DO_BLOCO,
  idDoCard,
  pontoDeInsercao,
  type CardNaTela,
} from '../dom/seletores';
import { marcaDoCard } from '../dominio/predecessores';
import { carregarOpcoes, observarOpcoes, OPCOES_PADRAO, type Opcoes } from '../opcoes/opcoes';
import { criarRepositorio } from './dados';

const PREFIXO = '[predecessores]';
const DEBOUNCE_MS = 300;
/** Quanto esperar, numa página de board sem nenhum card achado, antes de avisar. */
const ESPERA_AVISO_SEM_CARDS_MS = 8000;
/** Depois de arrastar um card, espera o Azure DevOps salvar antes de reler o estado. */
const ESPERA_APOS_ARRASTAR_MS = 2000;

const avisar = (...args: unknown[]) => console.warn(PREFIXO, ...args);

function iniciar(): void {
  let opcoes: Opcoes = { ...OPCOES_PADRAO };
  const repo = criarRepositorio(buscarJson);

  let temporizador: ReturnType<typeof setTimeout> | undefined;
  let rodando = false;
  let pendente = false;
  let ultimaUrl = location.href;
  let semCardsDesde: number | null = null;
  let avisouSemCards = false;

  const paginaAtual = (): TipoDePagina | null => tipoDePagina(location.pathname);

  const ligado = (tipo: TipoDePagina) => (tipo === 'board' ? opcoes.ligarNoBoard : opcoes.ligarNoTaskboard);

  function agendar(atraso = DEBOUNCE_MS): void {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => void executar(), atraso);
  }

  function removerTudo(): void {
    document.querySelectorAll(`.${CLASSE_DO_BLOCO}`).forEach((el) => el.remove());
    document.querySelectorAll(`[${ATRIBUTO_MARCA}]`).forEach((el) => el.removeAttribute(ATRIBUTO_MARCA));
  }

  function verificarUrl(): void {
    if (location.href === ultimaUrl) return;
    ultimaUrl = location.href;
    semCardsDesde = null;
    avisouSemCards = false;
    agendar();
  }

  /** Card dentro da tela ou perto dela (o board é virtualizado; isto corta o resto). */
  function estaVisivel(el: HTMLElement): boolean {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const margemV = window.innerHeight;
    const margemH = window.innerWidth / 2;
    return r.bottom >= -margemV && r.top <= window.innerHeight + margemV && r.right >= -margemH && r.left <= window.innerWidth + margemH;
  }

  function vigiarSeletores(tipo: TipoDePagina, quantos: number): void {
    if (quantos > 0) {
      semCardsDesde = null;
      return;
    }
    if (avisouSemCards) return;
    const agora = Date.now();
    semCardsDesde ??= agora;
    if (agora - semCardsDesde >= ESPERA_AVISO_SEM_CARDS_MS) {
      avisouSemCards = true;
      avisar(
        `nenhum card encontrado no ${tipo}. Se o board tem cards, a tela do Azure DevOps mudou e src/dom/seletores.ts precisa ser atualizado.`,
      );
    } else {
      agendar(ESPERA_AVISO_SEM_CARDS_MS);
    }
  }

  function desenhar(card: CardNaTela, base: string, projeto: string | undefined): void {
    const corte = repo.linhasDoCard(card.id, base, projeto, opcoes);
    if (corte === null) return; // faltam dados: deixa o card como está

    const vazio = corte.visiveis.length === 0 && corte.restantes.length === 0;
    const marca = marcaDoCard(card.id, corte);
    const existente = blocoDoCard(card.el);
    if (card.el.getAttribute(ATRIBUTO_MARCA) === marca && (vazio || existente)) return;

    existente?.remove();
    card.el.setAttribute(ATRIBUTO_MARCA, marca);
    if (vazio) return;
    const bloco = montarBloco(document, corte.visiveis, corte.restantes, { abrirEmNovaAba: opcoes.abrirEmNovaAba });
    pontoDeInsercao(card.el).appendChild(bloco);
  }

  async function processar(): Promise<void> {
    verificarUrl();
    const tipo = paginaAtual();
    const colecao = colecaoDaUrl(location.href);
    if (!tipo || !colecao || !ligado(tipo)) {
      removerTudo();
      return;
    }

    const cards = acharCards(document, tipo);
    vigiarSeletores(tipo, cards.length);
    const visiveis = cards.filter((c) => estaVisivel(c.el));
    if (visiveis.length === 0) return;

    await repo.carregar(
      colecao.base,
      visiveis.map((c) => c.id),
      opcoes.validadeDoCacheSeg * 1000,
    );

    for (const card of visiveis) {
      // O React pode ter recriado ou reciclado o card durante a busca.
      if (!card.el.isConnected || idDoCard(card.el) !== card.id) continue;
      try {
        desenhar(card, colecao.base, colecao.projeto);
      } catch (e) {
        avisar('erro ao desenhar o card', card.id, e);
      }
    }
  }

  async function executar(): Promise<void> {
    if (rodando) {
      pendente = true;
      return;
    }
    rodando = true;
    try {
      await processar();
    } catch (e) {
      if ((e as Error)?.name === 'SessaoVencida') {
        // Sessão vencida: não mostra nada até o usuário entrar de novo.
        removerTudo();
        repo.limpar();
      } else {
        avisar(e);
      }
    } finally {
      rodando = false;
      if (pendente) {
        pendente = false;
        agendar();
      }
    }
  }

  // --- Observar a tela -------------------------------------------------------

  /** Ignora as mutações causadas pelo próprio bloco, para não entrar em laço. */
  const ehDoBloco = (n: Node) =>
    n instanceof Element && (n.classList.contains(CLASSE_DO_BLOCO) || !!n.closest(`.${CLASSE_DO_BLOCO}`));

  const observador = new MutationObserver((mutacoes) => {
    verificarUrl();
    if (!paginaAtual()) return;
    const relevante = mutacoes.some((m) => {
      if (ehDoBloco(m.target)) return false;
      const nos = [...m.addedNodes, ...m.removedNodes];
      return nos.length === 0 || nos.some((n) => !ehDoBloco(n));
    });
    if (relevante) agendar();
  });
  // Observa o body: o contêiner do board é recriado na navegação interna da aplicação.
  observador.observe(document.body, { childList: true, subtree: true });

  // Navegação interna (pushState não é visível do mundo isolado do content script).
  window.addEventListener('popstate', verificarUrl);
  setInterval(verificarUrl, 1000);

  // Rolagem (cards novos no board virtualizado) e redimensionamento.
  document.addEventListener('scroll', () => paginaAtual() && agendar(), { capture: true, passive: true });
  window.addEventListener('resize', () => paginaAtual() && agendar(), { passive: true });

  // Volta à aba: com o cache vencido, a passada busca de novo.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && paginaAtual()) agendar(0);
  });

  // Card arrastado para outra coluna: relê o estado dele depois que o Azure DevOps salvar.
  let arraste: { id: number; x: number; y: number; moveu: boolean } | null = null;
  document.addEventListener(
    'pointerdown',
    (e) => {
      const tipo = paginaAtual();
      const card = tipo ? cardDoElemento(e.target as Element | null, tipo) : null;
      const id = card ? idDoCard(card) : null;
      arraste = id !== null ? { id, x: e.clientX, y: e.clientY, moveu: false } : null;
    },
    { capture: true, passive: true },
  );
  const marcarMovimento = () => {
    if (arraste) arraste.moveu = true;
  };
  document.addEventListener('dragstart', marcarMovimento, { capture: true, passive: true });
  document.addEventListener('pointercancel', marcarMovimento, { capture: true, passive: true });
  const fimDoArraste = (e: Event) => {
    if (!arraste) return;
    const { id, x, y } = arraste;
    const pe = e as PointerEvent;
    const moveu = arraste.moveu || (typeof pe.clientX === 'number' && Math.hypot(pe.clientX - x, pe.clientY - y) > 8);
    arraste = null;
    if (!moveu) return;
    setTimeout(() => {
      repo.invalidarCard(id);
      agendar(0);
    }, ESPERA_APOS_ARRASTAR_MS);
  };
  for (const tipo of ['pointerup', 'dragend', 'drop']) {
    document.addEventListener(tipo, fimDoArraste, { capture: true, passive: true });
  }

  // --- Opções ----------------------------------------------------------------

  observarOpcoes((novas) => {
    opcoes = novas;
    agendar(0);
  });
  void carregarOpcoes().then((carregadas) => {
    opcoes = carregadas;
    agendar(0);
  });
}

declare global {
  interface Window {
    __ivtPredIniciado?: boolean;
  }
}

try {
  if (!window.__ivtPredIniciado) {
    window.__ivtPredIniciado = true;
    iniciar();
  }
} catch (e) {
  avisar('não foi possível iniciar', e);
}
