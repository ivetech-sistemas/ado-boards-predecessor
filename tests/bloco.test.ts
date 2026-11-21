// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { montarBloco, textoDoTooltip, type LinhaDoBloco } from '../src/dom/bloco';

const URL_10 = 'https://dev.azure.com/org/Proj/_workitems/edit/10';

const aberta: LinhaDoBloco = {
  id: 10,
  acessivel: true,
  titulo: 'Criar API de clientes com um título bem comprido',
  tipo: 'Product Backlog Item',
  estado: 'In Progress',
  cor: '#007acc',
  responsavel: { nome: 'Maria Silva', avatarUrl: 'https://dev.azure.com/org/_apis/GraphProfile/MemberAvatars/x' },
  url: URL_10,
};

function montar(visiveis: LinhaDoBloco[], restantes: LinhaDoBloco[] = [], abrirEmNovaAba = true) {
  const abrir = vi.fn();
  const card = document.createElement('div');
  card.className = 'card';
  const aoClicarNoCard = vi.fn();
  for (const tipo of ['click', 'pointerdown', 'mousedown', 'dragstart', 'keydown']) card.addEventListener(tipo, aoClicarNoCard);
  const bloco = montarBloco(document, visiveis, restantes, { abrirEmNovaAba, abrir });
  card.appendChild(bloco);
  document.body.appendChild(card);
  return { bloco, abrir, aoClicarNoCard };
}

describe('montarBloco', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('linha completa: seta, estado, foto e título', () => {
    const { bloco } = montar([aberta]);
    expect(bloco.className).toBe('ivt-pred-bloco');
    const linha = bloco.querySelector('a.ivt-pred-linha')!;
    expect(linha.getAttribute('href')).toBe(URL_10);
    expect(linha.getAttribute('draggable')).toBe('false');

    const filhos = [...linha.children].map((c) => c.getAttribute('class'));
    expect(filhos).toEqual(['ivt-pred-seta', 'ivt-pred-estado', 'ivt-pred-avatar', 'ivt-pred-titulo']);

    const estado = linha.querySelector<HTMLElement>('.ivt-pred-estado')!;
    expect(estado.title).toBe('Estado: In Progress');
    expect(estado.style.backgroundColor).toBe('rgb(0, 122, 204)');

    const foto = linha.querySelector<HTMLImageElement>('img.ivt-pred-avatar')!;
    expect(foto.src).toBe(aberta.responsavel!.avatarUrl);
    expect(foto.title).toBe('Maria Silva');

    const titulo = linha.querySelector<HTMLElement>('.ivt-pred-titulo')!;
    expect(titulo.textContent).toBe(aberta.titulo);
    expect(titulo.title).toBe(`#10 Product Backlog Item — ${aberta.titulo}`);
  });

  it('foto que falha vira iniciais', () => {
    const { bloco } = montar([aberta]);
    bloco.querySelector('img')!.dispatchEvent(new Event('error'));
    const iniciais = bloco.querySelector<HTMLElement>('.ivt-pred-iniciais')!;
    expect(iniciais.textContent).toBe('MS');
    expect(iniciais.title).toBe('Maria Silva');
  });

  it('sem foto: iniciais; sem responsável: espaço vazio do mesmo tamanho', () => {
    const { bloco } = montar([
      { ...aberta, id: 11, responsavel: { nome: 'João Lima' } },
      { ...aberta, id: 12, responsavel: undefined },
    ]);
    const [a, b] = bloco.querySelectorAll('.ivt-pred-linha');
    expect(a!.querySelector('.ivt-pred-iniciais')!.textContent).toBe('JL');
    const vazio = b!.querySelector('.ivt-pred-avatar')!;
    expect(vazio.classList.contains('ivt-pred-sem-responsavel')).toBe(true);
    expect(vazio.textContent).toBe('');
  });

  it('sem permissão: só a seta e #id, sem link (RF10)', () => {
    const { bloco } = montar([{ id: 55, acessivel: false }]);
    const linha = bloco.querySelector('.ivt-pred-linha')!;
    expect(linha.tagName).toBe('DIV');
    expect(linha.classList.contains('ivt-pred-sem-acesso')).toBe(true);
    expect(linha.querySelector('.ivt-pred-seta')).not.toBeNull();
    expect(linha.querySelector('.ivt-pred-estado')).toBeNull();
    expect(linha.querySelector('.ivt-pred-avatar')).toBeNull();
    expect(linha.textContent).toBe('#55');
  });

  it('+K com tooltip listando os restantes', () => {
    const { bloco } = montar([aberta], [{ ...aberta, id: 20, titulo: 'Outro' }, { id: 21, acessivel: false }]);
    const mais = bloco.querySelector<HTMLElement>('.ivt-pred-mais')!;
    expect(mais.textContent).toBe('+2');
    expect(mais.title).toBe('#20 Product Backlog Item — Outro\n#21 (sem permissão de leitura)');
  });

  it('clique abre o predecessor em nova aba e não chega ao card (RF7)', () => {
    const { bloco, abrir, aoClicarNoCard } = montar([aberta]);
    const titulo = bloco.querySelector('.ivt-pred-titulo')!;

    const pd = new MouseEvent('pointerdown', { bubbles: true, cancelable: true });
    titulo.dispatchEvent(pd);
    expect(pd.defaultPrevented).toBe(true);

    const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    titulo.dispatchEvent(md);

    const clique = new MouseEvent('click', { bubbles: true, cancelable: true });
    titulo.dispatchEvent(clique);
    expect(clique.defaultPrevented).toBe(true);

    expect(abrir).toHaveBeenCalledWith(URL_10, true);
    expect(aoClicarNoCard).not.toHaveBeenCalled();
  });

  it('opção "mesma aba"; Ctrl+clique força nova aba', () => {
    const { bloco, abrir } = montar([aberta], [], false);
    const linha = bloco.querySelector('.ivt-pred-linha')!;
    linha.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    linha.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
    expect(abrir.mock.calls).toEqual([
      [URL_10, false],
      [URL_10, true],
    ]);
  });

  it('botão do meio abre em nova aba', () => {
    const { bloco, abrir } = montar([aberta], [], false);
    bloco.querySelector('.ivt-pred-titulo')!.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));
    expect(abrir).toHaveBeenCalledWith(URL_10, true);
  });

  it('clique em linha sem link e no +K não abre nada nem chega ao card', () => {
    const { bloco, abrir, aoClicarNoCard } = montar([{ id: 55, acessivel: false }], [aberta]);
    bloco.querySelector('.ivt-pred-sem-acesso')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    bloco.querySelector('.ivt-pred-mais')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(abrir).not.toHaveBeenCalled();
    expect(aoClicarNoCard).not.toHaveBeenCalled();
  });

  it('arrastar a partir do bloco é impedido', () => {
    const { bloco, aoClicarNoCard } = montar([aberta]);
    const ev = new Event('dragstart', { bubbles: true, cancelable: true });
    bloco.querySelector('.ivt-pred-linha')!.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(aoClicarNoCard).not.toHaveBeenCalled();
  });

  it('Enter no link não chega ao card', () => {
    const { bloco, aoClicarNoCard } = montar([aberta]);
    bloco.querySelector('.ivt-pred-linha')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(aoClicarNoCard).not.toHaveBeenCalled();
  });

  it('textoDoTooltip', () => {
    expect(textoDoTooltip({ id: 1, acessivel: true, titulo: 'T' })).toBe('#1 — T');
    expect(textoDoTooltip({ id: 1, acessivel: true, tipo: 'Bug', titulo: 'T' })).toBe('#1 Bug — T');
  });
});
