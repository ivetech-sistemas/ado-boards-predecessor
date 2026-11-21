import { describe, expect, it } from 'vitest';
import { colecaoDaUrl, linkDoWorkItem, tipoDePagina } from '../src/api/base';

describe('colecaoDaUrl', () => {
  it('dev.azure.com/{org}/{projeto}', () => {
    expect(colecaoDaUrl('https://dev.azure.com/minhaorg/Meu%20Projeto/_boards/board/t/Time/Backlog%20items')).toEqual({
      base: 'https://dev.azure.com/minhaorg',
      projeto: 'Meu Projeto',
    });
  });

  it('{org}.visualstudio.com/DefaultCollection/{projeto}', () => {
    expect(colecaoDaUrl('https://rssoft.visualstudio.com/DefaultCollection/Ivetech/_sprints/taskboard/Time/Ivetech/Sprint%201')).toEqual({
      base: 'https://rssoft.visualstudio.com/DefaultCollection',
      projeto: 'Ivetech',
    });
  });

  it('DefaultCollection sem diferenciar maiúsculas', () => {
    expect(colecaoDaUrl('https://rssoft.visualstudio.com/defaultcollection/Ivetech/_boards/board/')?.base).toBe(
      'https://rssoft.visualstudio.com/defaultcollection',
    );
  });

  it('{org}.visualstudio.com/{projeto}', () => {
    expect(colecaoDaUrl('https://rssoft.visualstudio.com/Ivetech/_boards/board/t/Time/Features')).toEqual({
      base: 'https://rssoft.visualstudio.com',
      projeto: 'Ivetech',
    });
  });

  it('página da organização, sem projeto', () => {
    expect(colecaoDaUrl('https://dev.azure.com/minhaorg/_settings/')).toEqual({ base: 'https://dev.azure.com/minhaorg' });
    expect(colecaoDaUrl('https://rssoft.visualstudio.com/DefaultCollection')).toEqual({
      base: 'https://rssoft.visualstudio.com/DefaultCollection',
    });
  });

  it('outros domínios e URLs inválidas', () => {
    expect(colecaoDaUrl('https://github.com/org/repo')).toBeNull();
    expect(colecaoDaUrl('http://dev.azure.com/org/proj')).toBeNull();
    expect(colecaoDaUrl('https://dev.azure.com/')).toBeNull();
    expect(colecaoDaUrl('não é url')).toBeNull();
  });
});

describe('tipoDePagina', () => {
  it('board de qualquer nível', () => {
    expect(tipoDePagina('/org/proj/_boards/board/t/Time/Epics')).toBe('board');
    expect(tipoDePagina('/DefaultCollection/Proj/_boards/board/t/Time/Backlog%20items')).toBe('board');
  });

  it('taskboard da sprint', () => {
    expect(tipoDePagina('/org/proj/_sprints/taskboard/Time/proj/Sprint%2010')).toBe('taskboard');
  });

  it('fora do escopo', () => {
    expect(tipoDePagina('/org/proj/_backlogs/backlog/Time/Backlog%20items')).toBeNull();
    expect(tipoDePagina('/org/proj/_queries/')).toBeNull();
    expect(tipoDePagina('/org/proj/_workitems/edit/12')).toBeNull();
  });
});

describe('linkDoWorkItem', () => {
  it('monta o link de edição com o projeto codificado', () => {
    expect(linkDoWorkItem('https://dev.azure.com/minhaorg', 'Meu Projeto', 42)).toBe(
      'https://dev.azure.com/minhaorg/Meu%20Projeto/_workitems/edit/42',
    );
    expect(linkDoWorkItem('https://rssoft.visualstudio.com/DefaultCollection', 'Ivetech', 7)).toBe(
      'https://rssoft.visualstudio.com/DefaultCollection/Ivetech/_workitems/edit/7',
    );
  });
});
