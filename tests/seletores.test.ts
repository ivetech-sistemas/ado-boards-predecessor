// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { montarBloco } from '../src/dom/bloco';
import {
  acharCards,
  blocoDoCard,
  cardDoElemento,
  colunaDoCard,
  idDoCard,
  idDoLink,
  pontoDeInsercao,
} from '../src/dom/seletores';

const fixture = (nome: string) => readFileSync(join(__dirname, 'fixtures', nome), 'utf-8');

const blocoCom = (id: number) =>
  montarBloco(document, [{ id, acessivel: true, titulo: 'Pred', url: `https://dev.azure.com/org/P/_workitems/edit/${id}` }], [], {
    abrirEmNovaAba: true,
    abrir: () => {},
  });

describe('taskboard real (fixture do spike)', () => {
  beforeEach(() => {
    document.body.innerHTML = fixture('taskboard.html');
  });

  it('acha o card pai (PBI) e a task, com o ID do data-itemid', () => {
    const cards = acharCards(document, 'taskboard');
    expect(cards.map((c) => c.id)).toEqual([7886, 7957]);
    expect(cards.every((c) => c.el.matches('.wit-card.taskboard-card[role="group"]'))).toBe(true);
  });

  it('insere no .card-content, depois das tags, e não mexe nos nativos', () => {
    const [card] = acharCards(document, 'taskboard');
    const alvo = pontoDeInsercao(card!.el);
    expect(alvo.parentElement).toBe(card!.el);
    expect(alvo.classList.contains('card-content')).toBe(true);

    const filhosAntes = [...alvo.children];
    alvo.appendChild(blocoCom(10));
    expect([...alvo.children].slice(0, -1)).toEqual(filhosAntes);
    expect(alvo.lastElementChild!.previousElementSibling!.classList.contains('flex-column')).toBe(true);
    expect(idDoCard(card!.el)).toBe(7886);
    expect(acharCards(document, 'taskboard').map((c) => c.id)).toEqual([7886, 7957]);
  });

  it('do título até o card (detecção do arrastar)', () => {
    const titulo = document.querySelector('[data-itemid="7957"] .title-text')!;
    expect(cardDoElemento(titulo, 'taskboard')?.getAttribute('data-itemid')).toBe('7957');
  });

  it('o link nativo do título tem o ID (relativo à origem)', () => {
    const href = document.querySelector('[data-itemid="7886"] a.title')!.getAttribute('href');
    expect(idDoLink(href)).toBe(7886);
  });
});

describe('board real (fixture do spike)', () => {
  beforeEach(() => {
    document.body.innerHTML = fixture('board.html');
  });

  it('acha os cards com o ID do data-itemid', () => {
    const cards = acharCards(document, 'board');
    expect(cards.map((c) => c.id)).toEqual([7887, 7888]);
    expect(cards.every((c) => c.el.matches('.wit-card.boards-card[role="group"]'))).toBe(true);
  });

  it('insere no .card-content, depois das anotações, e não mexe nos nativos', () => {
    const [card] = acharCards(document, 'board');
    const alvo = pontoDeInsercao(card!.el);
    expect(alvo.parentElement).toBe(card!.el);
    expect(alvo.classList.contains('card-content')).toBe(true);

    const filhosAntes = [...alvo.children];
    alvo.appendChild(blocoCom(10));
    expect([...alvo.children].slice(0, -1)).toEqual(filhosAntes);
    expect(alvo.lastElementChild!.previousElementSibling!.classList.contains('annotations')).toBe(true);
    expect(idDoCard(card!.el)).toBe(7887);
  });

  it('coluna do card pelo data-column, e mudança de coluna', () => {
    const [card] = acharCards(document, 'board');
    expect(colunaDoCard(card!.el)).toBe('fce7dfdd-2706-4576-9547-7a267558ce77');
    document.querySelector('[data-done="true"]')!.appendChild(card!.el);
    expect(colunaDoCard(card!.el)).toBe('00000000-0000-0000-0000-00000000d0e0');
  });

  it('taskboard não tem coluna exposta', () => {
    document.body.innerHTML = fixture('taskboard.html');
    const [card] = acharCards(document, 'taskboard');
    expect(colunaDoCard(card!.el)).toBeNull();
  });
});

describe('seletores: reservas e casos de borda', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('sem atributo de dados: ID pelo link ou pelo campo ID', () => {
    document.body.innerHTML = fixture('sem-data-itemid.provisorio.html');
    const cards = acharCards(document, 'board');
    expect(cards.map((c) => c.id)).toEqual([101, 102]);
    expect(pontoDeInsercao(cards[0]!.el).classList.contains('wit-card-content')).toBe(true);
  });

  it('taskboard antigo: ID pelo id="tile-N"', () => {
    document.body.innerHTML = `
      <div class="tbTile" id="tile-201"><div class="tbTileContent">Implementar</div></div>
      <div class="tbTile" id="tile-202"><div class="tbTileContent">Testes</div></div>`;
    const cards = acharCards(document, 'taskboard');
    expect(cards.map((c) => c.id)).toEqual([201, 202]);
    expect(pontoDeInsercao(cards[0]!.el).classList.contains('tbTileContent')).toBe(true);
  });

  it('tela desconhecida: plano de reserva pelo link do work item', () => {
    document.body.innerHTML = fixture('desconhecido.provisorio.html');
    const cards = acharCards(document, 'board');
    expect(cards.map((c) => c.id)).toEqual([301, 302]);
    expect(cards[0]!.el.classList.contains('xyz-item')).toBe(true);
  });

  it('o link do próprio bloco não muda o ID do card nem vira card', () => {
    document.body.innerHTML = fixture('desconhecido.provisorio.html');
    const [primeiro] = acharCards(document, 'board');
    primeiro!.el.appendChild(blocoCom(999));
    expect(idDoCard(primeiro!.el)).toBe(301);
    expect(acharCards(document, 'board').map((c) => c.id)).toEqual([301, 302]);
    expect(blocoDoCard(primeiro!.el)).not.toBeNull();
  });

  it('atributo de dados tem prioridade e fica o card mais interno', () => {
    document.body.innerHTML = `
      <div data-itemid="1"><div data-itemid="2"><span>x</span></div></div>
      <div data-item-id="3"></div>`;
    // primeiro seletor que casa: [data-itemid]; o externo contém o interno -> fica o interno
    expect(acharCards(document, 'board').map((c) => c.id)).toEqual([2]);
  });

  it('nenhum card na tela', () => {
    document.body.innerHTML = '<div class="vazio"><a href="/org/P/_workitems/edit/5">solto</a></div>';
    expect(acharCards(document, 'board')).toEqual([]);
  });

  it('cardDoElemento sobe do filho até o card e ignora o bloco', () => {
    document.body.innerHTML = fixture('sem-data-itemid.provisorio.html');
    const titulo = document.querySelector('.wit-card-title')!;
    expect(cardDoElemento(titulo, 'board')?.classList.contains('wit-card')).toBe(true);
    const [card] = acharCards(document, 'board');
    const bloco = blocoCom(7);
    card!.el.appendChild(bloco);
    expect(cardDoElemento(bloco.querySelector('.ivt-pred-titulo'), 'board')).toBeNull();
  });

  it('idDoLink', () => {
    expect(idDoLink('/org/P/_workitems/edit/42')).toBe(42);
    expect(idDoLink('https://x.visualstudio.com/DefaultCollection/P/_workitems/edit/7?a=1')).toBe(7);
    expect(idDoLink('/org/P/_boards/board')).toBeNull();
    expect(idDoLink(null)).toBeNull();
  });
});
