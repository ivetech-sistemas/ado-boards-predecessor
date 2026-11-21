import { describe, expect, it } from 'vitest';
import {
  cortarLinhas,
  corDoEstado,
  emLotes,
  estaConcluido,
  extrairPredecessores,
  hash,
  idDaUrl,
  iniciais,
  marcaDoCard,
  normalizarCor,
  REL_PREDECESSOR,
  type EstadoDoTipo,
} from '../src/dominio/predecessores';

const url = (id: number) => `https://dev.azure.com/org/_apis/wit/workItems/${id}`;

describe('extrairPredecessores', () => {
  it('pega só Dependency-Reverse, sem repetir, na ordem', () => {
    const relations = [
      { rel: 'System.LinkTypes.Hierarchy-Reverse', url: url(1) },
      { rel: REL_PREDECESSOR, url: url(10) },
      { rel: 'System.LinkTypes.Dependency-Forward', url: url(20) },
      { rel: REL_PREDECESSOR, url: url(11) },
      { rel: REL_PREDECESSOR, url: url(10) },
      { rel: 'ArtifactLink', url: 'vstfs:///Git/Commit/abc' },
    ];
    expect(extrairPredecessores(relations)).toEqual([10, 11]);
  });

  it('relations ausente ou nula', () => {
    expect(extrairPredecessores(undefined)).toEqual([]);
    expect(extrairPredecessores(null)).toEqual([]);
    expect(extrairPredecessores([])).toEqual([]);
  });

  it('url de outro projeto e url malformada', () => {
    expect(
      extrairPredecessores([
        { rel: REL_PREDECESSOR, url: 'https://rssoft.visualstudio.com/DefaultCollection/abc-guid/_apis/wit/workItems/99' },
        { rel: REL_PREDECESSOR, url: 'https://x/qualquer' },
      ]),
    ).toEqual([99]);
  });
});

describe('idDaUrl', () => {
  it('aceita maiúsculas, barra final e query', () => {
    expect(idDaUrl(url(5))).toBe(5);
    expect(idDaUrl('https://x/_apis/wit/workitems/6/')).toBe(6);
    expect(idDaUrl('https://x/_apis/wit/WorkItems/7?api-version=7.1')).toBe(7);
    expect(idDaUrl('https://x/_apis/wit/workitems/abc')).toBeNull();
  });
});

describe('estaConcluido', () => {
  const scrum: EstadoDoTipo[] = [
    { name: 'New', color: '#b2b2b2', category: 'Proposed' },
    { name: 'In Progress', color: '#007acc', category: 'InProgress' },
    { name: 'Done', color: '#339933', category: 'Completed' },
    { name: 'Removed', color: '#ffffff', category: 'Removed' },
  ];
  const portugues: EstadoDoTipo[] = [
    { name: 'Fazendo', color: '#007acc', category: 'InProgress' },
    { name: 'Concluído', color: '#339933', category: 'Completed' },
  ];

  it('usa a categoria, não o nome', () => {
    expect(estaConcluido('Done', scrum)).toBe(true);
    expect(estaConcluido('Removed', scrum)).toBe(true);
    expect(estaConcluido('In Progress', scrum)).toBe(false);
    expect(estaConcluido('New', scrum)).toBe(false);
    expect(estaConcluido('Concluído', portugues)).toBe(true);
    expect(estaConcluido('Fazendo', portugues)).toBe(false);
  });

  it('um "Done" que não é Completed não conta como concluído', () => {
    expect(estaConcluido('Done', [{ name: 'Done', color: '', category: 'Resolved' }])).toBe(false);
  });

  it('nome sem diferenciar maiúsculas', () => {
    expect(estaConcluido('done', scrum)).toBe(true);
  });

  it('estado ou lista desconhecida conta como aberto', () => {
    expect(estaConcluido('Qualquer', scrum)).toBe(false);
    expect(estaConcluido('Done', undefined)).toBe(false);
    expect(estaConcluido(undefined, scrum)).toBe(false);
  });

  it('corDoEstado', () => {
    expect(corDoEstado('In Progress', scrum)).toBe('#007acc');
    expect(corDoEstado('x', scrum)).toBeUndefined();
  });
});

describe('normalizarCor', () => {
  it('formatos da API', () => {
    expect(normalizarCor('007acc')).toBe('#007acc');
    expect(normalizarCor('#007acc')).toBe('#007acc');
    expect(normalizarCor('ff007acc')).toBe('#007acc');
    expect(normalizarCor('')).toBe('#b2b2b2');
    expect(normalizarCor(undefined)).toBe('#b2b2b2');
    expect(normalizarCor('vermelho')).toBe('#b2b2b2');
  });
});

describe('cortarLinhas', () => {
  it('até N, sem +K', () => {
    expect(cortarLinhas([1, 2, 3], 3)).toEqual({ visiveis: [1, 2, 3], restantes: [] });
    expect(cortarLinhas([1], 3)).toEqual({ visiveis: [1], restantes: [] });
    expect(cortarLinhas([], 3)).toEqual({ visiveis: [], restantes: [] });
  });

  it('acima de N, o resto vai para o +K', () => {
    expect(cortarLinhas([1, 2, 3, 4, 5], 3)).toEqual({ visiveis: [1, 2, 3], restantes: [4, 5] });
  });

  it('N inválido', () => {
    expect(cortarLinhas([1, 2], 0)).toEqual({ visiveis: [1], restantes: [2] });
    expect(cortarLinhas([1, 2, 3, 4], Number.NaN)).toEqual({ visiveis: [1, 2, 3], restantes: [4] });
  });
});

describe('iniciais', () => {
  it('primeiro e último nome', () => {
    expect(iniciais('Maria da Silva')).toBe('MS');
    expect(iniciais('Lucas')).toBe('L');
    expect(iniciais('  ana   souza ')).toBe('AS');
    expect(iniciais('Ângela Érica')).toBe('ÂÉ');
  });

  it('formato antigo e vazio', () => {
    expect(iniciais('João Lima <DOMINIO\\joao>')).toBe('JL');
    expect(iniciais('')).toBe('?');
    expect(iniciais(undefined)).toBe('?');
  });
});

describe('hash e marca', () => {
  it('estável e sensível ao conteúdo', () => {
    expect(hash('abc')).toBe(hash('abc'));
    expect(hash('abc')).not.toBe(hash('abd'));
    expect(marcaDoCard(7, { a: 1 })).toMatch(/^7:[0-9a-z]+$/);
    expect(marcaDoCard(7, { a: 1 })).not.toBe(marcaDoCard(7, { a: 2 }));
  });
});

describe('emLotes', () => {
  it('divide em lotes de até N', () => {
    expect(emLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(emLotes([], 200)).toEqual([]);
  });
});
