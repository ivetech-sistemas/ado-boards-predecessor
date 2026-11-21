/** Página de opções: salva a cada mudança, sem botão "Salvar". */
import { carregarOpcoes, normalizarOpcoes, OPCOES_PADRAO, salvarOpcoes, type Opcoes } from './opcoes';

const form = document.getElementById('form') as HTMLFormElement;
const status = document.getElementById('status') as HTMLSpanElement;
const chaves = Object.keys(OPCOES_PADRAO) as Array<keyof Opcoes>;

function campo(nome: keyof Opcoes): HTMLInputElement {
  return form.elements.namedItem(nome) as HTMLInputElement;
}

function preencher(opcoes: Opcoes): void {
  for (const k of chaves) {
    const el = campo(k);
    const valor = opcoes[k];
    if (el.type === 'checkbox') el.checked = Boolean(valor);
    else el.value = String(valor);
  }
}

function lerFormulario(): Opcoes {
  const bruto: Partial<Record<keyof Opcoes, unknown>> = {};
  for (const k of chaves) {
    const el = campo(k);
    bruto[k] = el.type === 'checkbox' ? el.checked : el.valueAsNumber;
  }
  return normalizarOpcoes(bruto);
}

let temporizador: number | undefined;
function avisar(texto: string): void {
  status.textContent = texto;
  window.clearTimeout(temporizador);
  temporizador = window.setTimeout(() => (status.textContent = ''), 2000);
}

async function salvar(): Promise<void> {
  const opcoes = lerFormulario();
  try {
    await salvarOpcoes(opcoes);
    preencher(opcoes); // mostra o valor corrigido (ex.: fora da faixa)
    avisar('Salvo. Vale para as abas do Azure DevOps já abertas.');
  } catch (e) {
    avisar('Não foi possível salvar.');
    console.warn('[predecessores]', e);
  }
}

form.addEventListener('change', () => void salvar());
form.addEventListener('submit', (e) => e.preventDefault());
document.getElementById('padrao')!.addEventListener('click', () => {
  preencher({ ...OPCOES_PADRAO });
  void salvar();
});

void carregarOpcoes().then(preencher);
