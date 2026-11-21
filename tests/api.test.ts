import { describe, expect, it, vi } from 'vitest';
import { criarCacheDeEstados, urlDosEstados } from '../src/api/estados';
import { criarLimitador } from '../src/api/http';
import {
  buscarCards,
  buscarPredecessores,
  pessoaDaIdentidade,
  urlDasRelacoes,
  urlDosCampos,
} from '../src/api/workitems';
import { REL_PREDECESSOR } from '../src/dominio/predecessores';

const BASE = 'https://dev.azure.com/org';

describe('URLs', () => {
  it('relações: $expand=relations, errorPolicy=omit, sem fields', () => {
    const u = urlDasRelacoes(BASE, [1, 2]);
    expect(u).toBe(`${BASE}/_apis/wit/workitems?ids=1,2&$expand=relations&errorPolicy=omit&api-version=7.1`);
    expect(u).not.toContain('fields=');
  });

  it('campos: só os necessários, sem $expand', () => {
    const u = urlDosCampos(BASE, [3]);
    expect(u).toContain('fields=System.Id,System.Title,System.State,System.WorkItemType,System.AssignedTo,System.TeamProject');
    expect(u).toContain('errorPolicy=omit');
    expect(u).not.toContain('$expand');
  });

  it('estados: projeto e tipo codificados', () => {
    expect(urlDosEstados(BASE, 'Meu Projeto', 'Product Backlog Item')).toBe(
      `${BASE}/Meu%20Projeto/_apis/wit/workitemtypes/Product%20Backlog%20Item/states?api-version=7.1`,
    );
  });
});

describe('buscarCards', () => {
  it('lê estado, tipo, projeto e predecessores; ignora nulos do errorPolicy=omit', async () => {
    const buscar = vi.fn(async () => ({
      value: [
        {
          id: 1,
          fields: { 'System.State': 'Committed', 'System.WorkItemType': 'Product Backlog Item', 'System.TeamProject': 'P' },
          relations: [{ rel: REL_PREDECESSOR, url: `${BASE}/_apis/wit/workItems/10` }],
        },
        null,
        { id: 2, fields: {}, relations: null },
      ],
    }));
    const r = await buscarCards(buscar, BASE, [1, 2, 3]);
    expect(r.get(1)).toEqual({ id: 1, estado: 'Committed', tipo: 'Product Backlog Item', projeto: 'P', predecessores: [10] });
    expect(r.get(2)?.predecessores).toEqual([]);
    expect(r.has(3)).toBe(false);
  });

  it('lotes de até 200 IDs', async () => {
    const buscar = vi.fn(async (_url: string) => ({ value: [] }));
    const ids = Array.from({ length: 450 }, (_, i) => i + 1);
    await buscarCards(buscar, BASE, ids);
    expect(buscar).toHaveBeenCalledTimes(3);
    const contagens = buscar.mock.calls.map(([u]) => u.match(/ids=([^&]+)/)![1]!.split(',').length);
    expect(contagens).toEqual([200, 200, 50]);
  });
});

describe('buscarPredecessores', () => {
  it('omitido pela API vira sem acesso (RF10)', async () => {
    const buscar = vi.fn(async () => ({
      value: [
        {
          id: 10,
          fields: {
            'System.Id': 10,
            'System.Title': 'Criar API',
            'System.State': 'In Progress',
            'System.WorkItemType': 'Product Backlog Item',
            'System.TeamProject': 'Outro',
            'System.AssignedTo': {
              displayName: 'Maria Silva',
              uniqueName: 'maria@x.com',
              imageUrl: `${BASE}/_api/_common/identityImage?id=1`,
              _links: { avatar: { href: `${BASE}/_apis/GraphProfile/MemberAvatars/aad.abc` } },
            },
          },
        },
        null,
      ],
    }));
    const r = await buscarPredecessores(buscar, BASE, [10, 11]);
    expect(r.get(10)).toEqual({
      id: 10,
      acessivel: true,
      titulo: 'Criar API',
      tipo: 'Product Backlog Item',
      estado: 'In Progress',
      projeto: 'Outro',
      responsavel: { nome: 'Maria Silva', avatarUrl: `${BASE}/_apis/GraphProfile/MemberAvatars/aad.abc` },
    });
    expect(r.get(11)).toEqual({ id: 11, acessivel: false });
  });
});

describe('pessoaDaIdentidade', () => {
  it('prefere _links.avatar.href, depois imageUrl', () => {
    expect(pessoaDaIdentidade({ displayName: 'A', imageUrl: 'i' })).toEqual({ nome: 'A', avatarUrl: 'i' });
    expect(pessoaDaIdentidade({ displayName: 'A' })).toEqual({ nome: 'A', avatarUrl: undefined });
    expect(pessoaDaIdentidade({ uniqueName: 'a@x' })).toEqual({ nome: 'a@x', avatarUrl: undefined });
  });

  it('sem responsável e formato antigo em texto', () => {
    expect(pessoaDaIdentidade(undefined)).toBeUndefined();
    expect(pessoaDaIdentidade({})).toBeUndefined();
    expect(pessoaDaIdentidade('João Lima <DOM\\joao>')).toEqual({ nome: 'João Lima' });
  });
});

describe('cache de estados', () => {
  const resposta = {
    value: [
      { name: 'In Progress', color: '007acc', category: 'InProgress' },
      { name: 'Done', color: '339933', category: 'Completed' },
    ],
  };

  it('busca uma vez por projeto e tipo', async () => {
    const buscar = vi.fn(async () => resposta);
    const cache = criarCacheDeEstados(buscar);
    await cache.garantir(BASE, [
      { projeto: 'P', tipo: 'Bug' },
      { projeto: 'p', tipo: 'bug' },
      { projeto: 'P', tipo: 'Task' },
      { projeto: undefined, tipo: 'Task' },
    ]);
    await cache.garantir(BASE, [{ projeto: 'P', tipo: 'Bug' }]);
    expect(buscar).toHaveBeenCalledTimes(2);
    expect(cache.obter('P', 'Bug')).toEqual([
      { name: 'In Progress', color: '#007acc', category: 'InProgress' },
      { name: 'Done', color: '#339933', category: 'Completed' },
    ]);
  });

  it('erro de um par só avisa e tenta de novo depois', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const buscar = vi.fn().mockRejectedValueOnce(new Error('rede')).mockResolvedValue(resposta);
    const cache = criarCacheDeEstados(buscar);
    await cache.garantir(BASE, [{ projeto: 'P', tipo: 'Bug' }]);
    expect(cache.obter('P', 'Bug')).toBeUndefined();
    expect(aviso.mock.calls[0]?.[0]).toBe('[predecessores] não foi possível ler os estados de');
    await cache.garantir(BASE, [{ projeto: 'P', tipo: 'Bug' }]);
    expect(cache.obter('P', 'Bug')).toHaveLength(2);
    aviso.mockRestore();
  });

  it('sessão vencida sobe', async () => {
    const erro = Object.assign(new Error('401'), { name: 'SessaoVencida' });
    const cache = criarCacheDeEstados(vi.fn().mockRejectedValue(erro));
    await expect(cache.garantir(BASE, [{ projeto: 'P', tipo: 'Bug' }])).rejects.toBe(erro);
  });
});

describe('limitador', () => {
  it('no máximo 2 simultâneas', async () => {
    const limitar = criarLimitador(2);
    let ativos = 0;
    let pico = 0;
    const tarefa = () =>
      limitar(async () => {
        ativos++;
        pico = Math.max(pico, ativos);
        await new Promise((r) => setTimeout(r, 5));
        ativos--;
      });
    await Promise.all(Array.from({ length: 6 }, tarefa));
    expect(pico).toBe(2);
  });

  it('libera a vaga quando a tarefa falha', async () => {
    const limitar = criarLimitador(1);
    await expect(limitar(async () => Promise.reject(new Error('x')))).rejects.toThrow('x');
    await expect(limitar(async () => 1)).resolves.toBe(1);
  });
});
