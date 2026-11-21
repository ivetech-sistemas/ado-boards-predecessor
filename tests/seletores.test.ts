// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { montarBloco } from '../src/dom/bloco';
import { acharCards, blocoDoCard, cardDoElemento, idDoCard, idDoLink, pontoDeInsercao } from '../src/dom/seletores';

const fixture = (nome: string) => readFileSync(join(__dirname, 'fixtures', nome), 'utf-8');

const blocoCom = (id: number) =>
  montarBloco(document, [{ id, acessivel: true, titulo: 'Pred', url: `https://dev.azure.com/org/P/_workitems/edit/${id}` }], [], {
    abrirEmNovaAba: true,
    abrir: () => {},
  });

describe('seletores (fixtures provisórias)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('board: acha os cards e o ID (link ou campo ID)', () => {
    document.body.innerHTML = fixture('board.provisorio.html');
    const cards = acharCards(document, 'board');
    expect(cards.map((c) => c.id)).toEqual([101, 102]);
    expect(cards.every((c) => c.el.classList.contains('wit-card'))).toBe(true);
  });

  it('board: insere dentro do contêiner de conteúdo do card', () => {
    document.body.innerHTML = fixture('board.provisorio.html');
    const [card] = acharCards(document, 'board');
    expect(pontoDeInsercao(card!.el).classList.contains('wit-card-content')).toBe(true);
  });

  it('taskboard: ID pelo id="tile-N"', () => {
    document.body.innerHTML = fixture('taskboard.provisorio.html');
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
    document.body.innerHTML = fixture('board.provisorio.html');
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
