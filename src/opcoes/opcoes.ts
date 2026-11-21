/** Opções da extensão, salvas em chrome.storage.sync. */

export interface Opcoes {
  ligarNoBoard: boolean;
  ligarNoTaskboard: boolean;
  maxLinhas: number;
  abrirEmNovaAba: boolean;
  esconderEmCardConcluido: boolean;
  validadeDoCacheSeg: number;
}

export const OPCOES_PADRAO: Readonly<Opcoes> = Object.freeze({
  ligarNoBoard: true,
  ligarNoTaskboard: true,
  maxLinhas: 3,
  abrirEmNovaAba: true,
  esconderEmCardConcluido: true,
  validadeDoCacheSeg: 60,
});

function inteiro(v: unknown, padrao: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return padrao;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function booleano(v: unknown, padrao: boolean): boolean {
  return typeof v === 'boolean' ? v : padrao;
}

/** Completa e corrige o que veio do storage (valores ausentes ou fora da faixa). */
export function normalizarOpcoes(bruto: Partial<Record<keyof Opcoes, unknown>> | null | undefined): Opcoes {
  const b = bruto ?? {};
  const p = OPCOES_PADRAO;
  return {
    ligarNoBoard: booleano(b.ligarNoBoard, p.ligarNoBoard),
    ligarNoTaskboard: booleano(b.ligarNoTaskboard, p.ligarNoTaskboard),
    maxLinhas: inteiro(b.maxLinhas, p.maxLinhas, 1, 20),
    abrirEmNovaAba: booleano(b.abrirEmNovaAba, p.abrirEmNovaAba),
    esconderEmCardConcluido: booleano(b.esconderEmCardConcluido, p.esconderEmCardConcluido),
    validadeDoCacheSeg: inteiro(b.validadeDoCacheSeg, p.validadeDoCacheSeg, 5, 3600),
  };
}

function storageDisponivel(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.sync;
}

export async function carregarOpcoes(): Promise<Opcoes> {
  if (!storageDisponivel()) return { ...OPCOES_PADRAO };
  try {
    const bruto = await chrome.storage.sync.get(Object.keys(OPCOES_PADRAO));
    return normalizarOpcoes(bruto as Partial<Opcoes>);
  } catch (e) {
    console.warn('[predecessores] não foi possível ler as opções; usando o padrão.', e);
    return { ...OPCOES_PADRAO };
  }
}

export async function salvarOpcoes(opcoes: Opcoes): Promise<void> {
  await chrome.storage.sync.set(normalizarOpcoes(opcoes));
}

/** Chama `aoMudar` com as opções novas sempre que forem alteradas em qualquer aba. */
export function observarOpcoes(aoMudar: (opcoes: Opcoes) => void): void {
  if (!storageDisponivel()) return;
  chrome.storage.onChanged.addListener((_mudancas, area) => {
    if (area === 'sync') void carregarOpcoes().then(aoMudar);
  });
}
