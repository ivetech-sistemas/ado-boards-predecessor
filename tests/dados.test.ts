import { describe, expect, it, vi } from 'vitest';
import { criarRepositorio } from '../src/content/dados';
import { REL_PREDECESSOR } from '../src/dominio/predecessores';

const BASE = 'https://dev.azure.com/org';
const OPCOES = { maxLinhas: 3, esconderEmCardConcluido: true };

interface ItemFalso {
  id: number;
  titulo?: string;
  estado: string;
  tipo?: string;
  projeto?: string;
  responsavel?: { displayName: string; _links?: { avatar: { href: string } } };
  predecessores?: number[];
}

const ESTADOS = {
  value: [
    { name: 'New', color: 'b2b2b2', category: 'Proposed' },
    { name: 'In Progress', color: '007acc', category: 'InProgress' },
    { name: 'Done', color: '339933', category: 'Completed' },
    { name: 'Removed', color: 'ffffff', category: 'Removed' },
  ],
};

/** API falsa do Azure DevOps: responde às três chamadas a partir de uma lista de itens. */
function apiFalsa(itens: ItemFalso[], semAcesso: number[] = []) {
  const porId = new Map(itens.map((i) => [i.id, i]));
  return vi.fn(async (url: string) => {
    if (url.includes('/states?')) return ESTADOS;
    const ids = url.match(/ids=([^&]+)/)![1]!.split(',').map(Number);
    const value = ids.map((id) => {
      const i = porId.get(id);
      if (!i || semAcesso.includes(id)) return null;
      const fields = {
        'System.Id': i.id,
        'System.Title': i.titulo ?? `Item ${i.id}`,
        'System.State': i.estado,
        'System.WorkItemType': i.tipo ?? 'Product Backlog Item',
        'System.TeamProject': i.projeto ?? 'Proj',
        ...(i.responsavel ? { 'System.AssignedTo': i.responsavel } : {}),
      };
      if (url.includes('$expand=relations')) {
        return {
          id,
          fields,
          relations: (i.predecessores ?? []).map((p) => ({ rel: REL_PREDECESSOR, url: `${BASE}/_apis/wit/workItems/${p}` })),
        };
      }
      return { id, fields };
    });
    return { count: value.length, value };
  });
}

const chamadasDe = (buscar: ReturnType<typeof apiFalsa>, trecho: string) =>
  buscar.mock.calls.filter(([u]) => u.includes(trecho)).length;

describe('repositório', () => {
  it('critério 1: um predecessor aberto e outro concluído mostram uma linha só', async () => {
    const buscar = apiFalsa([
      { id: 1, estado: 'New', predecessores: [10, 11] },
      {
        id: 10,
        titulo: 'Criar API',
        estado: 'In Progress',
        responsavel: { displayName: 'Maria Silva', _links: { avatar: { href: `${BASE}/avatar/maria` } } },
      },
      { id: 11, titulo: 'Já feito', estado: 'Done' },
    ]);
    const repo = criarRepositorio(buscar);
    await repo.carregar(BASE, [1], 60_000);
    const corte = repo.linhasDoCard(1, BASE, 'Proj', OPCOES)!;
    expect(corte.restantes).toEqual([]);
    expect(corte.visiveis).toEqual([
      {
        id: 10,
        acessivel: true,
        titulo: 'Criar API',
        tipo: 'Product Backlog Item',
        estado: 'In Progress',
        cor: '#007acc',
        responsavel: { nome: 'Maria Silva', avatarUrl: `${BASE}/avatar/maria` },
        url: `${BASE}/Proj/_workitems/edit/10`,
      },
    ]);
  });

  it('predecessor de outro projeto abre no projeto dele', async () => {
    const buscar = apiFalsa([
      { id: 1, estado: 'New', predecessores: [10] },
      { id: 10, estado: 'New', projeto: 'Outro Projeto' },
    ]);
    const repo = criarRepositorio(buscar);
    await repo.carregar(BASE, [1], 60_000);
    expect(repo.linhasDoCard(1, BASE, 'Proj', OPCOES)!.visiveis[0]!.url).toBe(`${BASE}/Outro%20Projeto/_workitems/edit/10`);
    expect(buscar.mock.calls.some(([u]) => u.includes('/Outro%20Projeto/_apis/wit/workitemtypes/'))).toBe(true);
  });

  it('predecessor sem permissão: só a seta e #id (RF10)', async () => {
    const buscar = apiFalsa(
      [
        { id: 1, estado: 'New', predecessores: [10] },
        { id: 10, estado: 'New' },
      ],
      [10],
    );
    const repo = criarRepositorio(buscar);
    await repo.carregar(BASE, [1], 60_000);
    expect(repo.linhasDoCard(1, BASE, 'Proj', OPCOES)!.visiveis).toEqual([{ id: 10, acessivel: false }]);
  });

  it('card concluído não mostra predecessores (RF9), salvo se a opção estiver desligada', async () => {
    const buscar = apiFalsa([
      { id: 1, estado: 'Done', predecessores: [10] },
      { id: 10, estado: 'New' },
    ]);
    const repo = criarRepositorio(buscar);
    await repo.carregar(BASE, [1], 60_000);
    expect(repo.linhasDoCard(1, BASE, 'Proj', OPCOES)).toEqual({ visiveis: [], restantes: [] });
    expect(repo.linhasDoCard(1, BASE, 'Proj', { ...OPCOES, esconderEmCardConcluido: false })!.visiveis).toHaveLength(1);
  });

  it('mais de N predecessores abertos: N linhas e o resto no +K', async () => {
    const buscar = apiFalsa([
      { id: 1, estado: 'New', predecessores: [10, 11, 12, 13, 14] },
      ...[10, 11, 12, 13, 14].map((id) => ({ id, estado: 'New' })),
    ]);
    const repo = criarRepositorio(buscar);
    await repo.carregar(BASE, [1], 60_000);
    const corte = repo.linhasDoCard(1, BASE, 'Proj', OPCOES)!;
    expect(corte.visiveis.map((l) => l.id)).toEqual([10, 11, 12]);
    expect(corte.restantes.map((l) => l.id)).toEqual([13, 14]);
  });

  it('card fora do cache devolve null (não mexe no card)', () => {
    const repo = criarRepositorio(apiFalsa([]));
    expect(repo.linhasDoCard(999, BASE, 'Proj', OPCOES)).toBeNull();
  });

  it('critério 2: com o cache vencido, o predecessor que foi para Done some', async () => {
    let agora = 0;
    const itens: ItemFalso[] = [
      { id: 1, estado: 'New', predecessores: [10] },
      { id: 10, estado: 'In Progress' },
    ];
    const buscar = apiFalsa(itens);
    const repo = criarRepositorio(buscar, () => agora);

    await repo.carregar(BASE, [1], 60_000);
    expect(repo.linhasDoCard(1, BASE, 'Proj', OPCOES)!.visiveis).toHaveLength(1);

    itens[1]!.estado = 'Done';
    agora = 30_000; // dentro da validade: não vai à rede
    await repo.carregar(BASE, [1], 60_000);
    expect(chamadasDe(buscar, 'fields=')).toBe(1);
    expect(repo.linhasDoCard(1, BASE, 'Proj', OPCOES)!.visiveis).toHaveLength(1);

    agora = 61_000; // venceu
    await repo.carregar(BASE, [1], 60_000);
    expect(chamadasDe(buscar, 'fields=')).toBe(2);
    expect(repo.linhasDoCard(1, BASE, 'Proj', OPCOES)!.visiveis).toHaveLength(0);
  });

  it('critério 5: 200 cards com poucas requisições (lotes de 200)', async () => {
    const cards: ItemFalso[] = Array.from({ length: 200 }, (_, i) => ({
      id: i + 1,
      estado: 'New',
      predecessores: [1000 + i, 2000 + (i % 7)],
    }));
    const preds: ItemFalso[] = [
      ...Array.from({ length: 200 }, (_, i) => ({ id: 1000 + i, estado: 'In Progress' })),
      ...Array.from({ length: 7 }, (_, i) => ({ id: 2000 + i, estado: 'New', tipo: 'Task' })),
    ];
    const buscar = apiFalsa([...cards, ...preds]);
    const repo = criarRepositorio(buscar);
    await repo.carregar(
      BASE,
      cards.map((c) => c.id),
      60_000,
    );
    expect(chamadasDe(buscar, '$expand=relations')).toBe(1);
    expect(chamadasDe(buscar, 'fields=')).toBe(2); // 207 predecessores
    expect(chamadasDe(buscar, '/states?')).toBe(2); // PBI e Task
    expect(buscar).toHaveBeenCalledTimes(5);
  });

  it('card arrastado: invalidarCard força reler só ele', async () => {
    const buscar = apiFalsa([
      { id: 1, estado: 'New', predecessores: [] },
      { id: 2, estado: 'New', predecessores: [] },
    ]);
    const repo = criarRepositorio(buscar);
    await repo.carregar(BASE, [1, 2], 60_000);
    repo.invalidarCard(1);
    await repo.carregar(BASE, [1, 2], 60_000);
    const ultima = buscar.mock.calls.filter(([u]) => u.includes('$expand=relations')).at(-1)![0];
    expect(ultima).toContain('ids=1&');
  });

  it('erro de rede sobe para o chamador', async () => {
    const repo = criarRepositorio(vi.fn().mockRejectedValue(new Error('rede')));
    await expect(repo.carregar(BASE, [1], 60_000)).rejects.toThrow('rede');
  });
});
