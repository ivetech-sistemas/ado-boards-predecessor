/**
 * Página de demonstração para as capturas do README.
 *
 * Usa o código REAL da extensão (repositório de dados, filtro de concluídos, seletores, bloco e CSS)
 * sobre uma reprodução simplificada do card do Azure DevOps: a estrutura vem do HTML capturado no
 * spike (tests/fixtures/), os estilos do Azure DevOps são aproximados e os dados são fictícios.
 *
 * Parâmetros: ?cena=board|taskboard|card&tema=claro|escuro
 */
import { criarRepositorio } from '../../src/content/dados';
import { montarBloco } from '../../src/dom/bloco';
import { acharCards, pontoDeInsercao } from '../../src/dom/seletores';
import { REL_PREDECESSOR } from '../../src/dominio/predecessores';

const BASE = 'https://dev.azure.com/exemplo';
const PROJETO = 'Loja Exemplo';

// --- Dados fictícios ---------------------------------------------------------

interface Item {
  id: number;
  titulo: string;
  tipo: 'Product Backlog Item' | 'Task' | 'Feature';
  estado: string;
  projeto?: string;
  responsavel?: string;
  foto?: boolean;
  esforco?: number;
  predecessores?: number[];
  tags?: string[];
}

const ITENS: Item[] = [
  // Board de Backlog items
  { id: 1201, titulo: 'Cadastro de cupons de desconto', tipo: 'Product Backlog Item', estado: 'New', esforco: 8, predecessores: [1188, 1190, 1195], tags: ['cupons'] },
  { id: 1202, titulo: 'Aplicação de cupons no checkout', tipo: 'Product Backlog Item', estado: 'New', esforco: 13, predecessores: [1201, 1188, 1170, 1171, 1172], tags: ['cupons', 'checkout'] },
  { id: 1185, titulo: 'Relatório de vendas por cupom', tipo: 'Product Backlog Item', estado: 'Approved', responsavel: 'Carla Mendes', foto: true, esforco: 5, predecessores: [1250, 1188] },
  { id: 1186, titulo: 'Exportar pedidos em CSV', tipo: 'Product Backlog Item', estado: 'Approved', responsavel: 'Bruno Lima', esforco: 3 },
  { id: 1188, titulo: 'API de pedidos com paginação e filtros', tipo: 'Product Backlog Item', estado: 'Committed', responsavel: 'Ana Souza', foto: true, esforco: 8, predecessores: [1150] },
  { id: 1170, titulo: 'Modelo de dados de assinaturas', tipo: 'Product Backlog Item', estado: 'Committed', responsavel: 'Bruno Lima', esforco: 5, predecessores: [1301] },
  { id: 1150, titulo: 'Autenticação de clientes', tipo: 'Product Backlog Item', estado: 'Done', responsavel: 'Ana Souza', foto: true, esforco: 5, predecessores: [1140] },
  // Predecessores que não estão no board
  { id: 1190, titulo: 'Tabela de preços por região', tipo: 'Product Backlog Item', estado: 'Done', responsavel: 'Carla Mendes', foto: true },
  { id: 1195, titulo: 'Definir regras de expiração de cupons', tipo: 'Product Backlog Item', estado: 'New' },
  { id: 1171, titulo: 'Cálculo de frete no carrinho', tipo: 'Product Backlog Item', estado: 'Approved', responsavel: 'Diego Rocha' },
  { id: 1172, titulo: 'Integração com o gateway de pagamento', tipo: 'Product Backlog Item', estado: 'Committed', responsavel: 'Ana Souza', foto: true },
  { id: 1140, titulo: 'Cadastro de clientes', tipo: 'Product Backlog Item', estado: 'Committed', responsavel: 'Diego Rocha' },
  { id: 1301, titulo: 'Plataforma de cobrança recorrente', tipo: 'Feature', estado: 'In Progress', projeto: 'Plataforma', responsavel: 'Elisa Prado', foto: true },
  // 1250: sem permissão de leitura (a API omite)
  // Taskboard
  { id: 1210, titulo: 'Tela de cadastro de cupons', tipo: 'Task', estado: 'To Do', esforco: 6, predecessores: [1211] },
  { id: 1211, titulo: 'Endpoint POST /cupons', tipo: 'Task', estado: 'In Progress', responsavel: 'Ana Souza', foto: true, esforco: 4, predecessores: [1213] },
  { id: 1212, titulo: 'Testes de integração dos cupons', tipo: 'Task', estado: 'To Do', responsavel: 'Bruno Lima', esforco: 3, predecessores: [1211, 1210] },
  { id: 1213, titulo: 'Migração da tabela de cupons', tipo: 'Task', estado: 'Done', responsavel: 'Diego Rocha', esforco: 2 },
];
const SEM_ACESSO = new Set([1250]);

const ESTADOS: Record<string, Array<{ name: string; color: string; category: string }>> = {
  'Product Backlog Item': [
    { name: 'New', color: 'b2b2b2', category: 'Proposed' },
    { name: 'Approved', color: '5688e0', category: 'Proposed' },
    { name: 'Committed', color: '007acc', category: 'InProgress' },
    { name: 'Done', color: '339933', category: 'Completed' },
    { name: 'Removed', color: 'ffffff', category: 'Removed' },
  ],
  Task: [
    { name: 'To Do', color: 'b2b2b2', category: 'Proposed' },
    { name: 'In Progress', color: '007acc', category: 'InProgress' },
    { name: 'Done', color: '339933', category: 'Completed' },
    { name: 'Removed', color: 'ffffff', category: 'Removed' },
  ],
  Feature: [
    { name: 'New', color: 'b2b2b2', category: 'Proposed' },
    { name: 'In Progress', color: '007acc', category: 'InProgress' },
    { name: 'Done', color: '339933', category: 'Completed' },
  ],
};

const COR_DO_TIPO: Record<Item['tipo'], string> = {
  'Product Backlog Item': '#0098c7',
  Task: '#a4880a',
  Feature: '#773b93',
};

const CORES_DE_AVATAR = ['#c239b3', '#038387', '#ca5010', '#4f6bed', '#8764b8'];

/** Foto fictícia: silhueta sobre um fundo colorido (SVG em data URI). */
function foto(nome: string): string {
  const cor = CORES_DE_AVATAR[[...nome].reduce((s, c) => s + c.charCodeAt(0), 0) % CORES_DE_AVATAR.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${cor}"/><circle cx="16" cy="12.5" r="6" fill="#fff" fill-opacity=".92"/><path d="M4 32c1.5-7 6.5-10.5 12-10.5S26.5 25 28 32z" fill="#fff" fill-opacity=".92"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const porId = new Map(ITENS.map((i) => [i.id, i]));

/** API falsa: responde às três chamadas da extensão como o Azure DevOps responderia. */
async function buscar(url: string): Promise<unknown> {
  const estados = /workitemtypes\/([^/]+)\/states/.exec(url);
  if (estados) return { value: ESTADOS[decodeURIComponent(estados[1]!)] ?? [] };

  const ids = /ids=([^&]+)/.exec(url)![1]!.split(',').map(Number);
  const comRelacoes = url.includes('$expand=relations');
  return {
    value: ids.map((id) => {
      const i = porId.get(id);
      if (!i || SEM_ACESSO.has(id)) return null;
      const fields: Record<string, unknown> = {
        'System.Id': i.id,
        'System.Title': i.titulo,
        'System.State': i.estado,
        'System.WorkItemType': i.tipo,
        'System.TeamProject': i.projeto ?? PROJETO,
      };
      if (i.responsavel) {
        fields['System.AssignedTo'] = {
          displayName: i.responsavel,
          ...(i.foto ? { _links: { avatar: { href: foto(i.responsavel) } } } : {}),
        };
      }
      return comRelacoes
        ? { id, fields, relations: (i.predecessores ?? []).map((p) => ({ rel: REL_PREDECESSOR, url: `${BASE}/_apis/wit/workItems/${p}` })) }
        : { id, fields };
    }),
  };
}

// --- Card nativo (estrutura do HTML real capturado no spike) -----------------

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function corDoEstado(item: Item): string {
  return `#${ESTADOS[item.tipo]!.find((e) => e.name === item.estado)?.color ?? 'b2b2b2'}`;
}

function iniciais(nome: string): string {
  const p = nome.split(' ');
  return (p[0]![0]! + (p.length > 1 ? p[p.length - 1]![0]! : '')).toUpperCase();
}

function htmlDoCard(id: number, classeDaTela: 'boards-card' | 'taskboard-card'): string {
  const i = porId.get(id)!;
  const pessoa = i.responsavel
    ? `<div class="nativo-pessoa">${
        i.foto ? `<img src="${foto(i.responsavel)}" alt="">` : `<span class="nativo-iniciais">${iniciais(i.responsavel)}</span>`
      }<span>${esc(i.responsavel)}</span></div>`
    : `<div class="nativo-pessoa nativo-sem-pessoa"><span class="nativo-iniciais"></span><span>Unassigned</span></div>`;
  const esforco = i.esforco
    ? `<div class="nativo-campo"><span class="nativo-rotulo">${i.tipo === 'Task' ? 'Remaining Work' : 'Effort'}</span><span>${i.esforco}</span></div>`
    : '';
  const tags = i.tags?.length ? `<div class="nativo-tags">${i.tags.map((t) => `<span class="nativo-tag">${esc(t)}</span>`).join('')}</div>` : '';
  return `
<div data-itemid="${id}" role="group" aria-roledescription="Card" class="wit-card depth-8 flex-row ${classeDaTela} body-s" tabindex="0">
  <div class="card-flag" style="background-color:${COR_DO_TIPO[i.tipo]}"></div>
  <div class="card-content flex-column flex-grow">
    <span class="nativo-cabecalho">
      <span class="nativo-icone" style="background-color:${COR_DO_TIPO[i.tipo]}"></span>
      <span class="nativo-id">${id}</span>
      <a class="title" draggable="false" href="/${encodeURIComponent(PROJETO)}/_workitems/edit/${id}">${esc(i.titulo)}</a>
    </span>
    <div class="nativo-estado"><span class="nativo-bolinha" style="background-color:${corDoEstado(i)}"></span>${esc(i.estado)}</div>
    ${pessoa}
    ${esforco}
    ${tags}
  </div>
</div>`;
}

// --- Cenas -------------------------------------------------------------------

function cenaBoard(): string {
  const colunas: Array<[string, number[], boolean]> = [
    ['New', [1201, 1202], false],
    ['Approved', [1185, 1186], false],
    ['Committed', [1188, 1170], false],
    ['Done', [1150], true],
  ];
  return `
<header class="topo"><span class="topo-titulo">Backlog items</span><span class="topo-aba ativa">Board</span><span class="topo-aba">Analytics</span></header>
<div class="kanban-board"><div class="kanban-board-content">
${colunas
  .map(
    ([nome, ids, feito], n) => `
  <div class="kanban-board-column" data-column="coluna-${n}" data-done="${feito}">
    <div class="coluna-titulo">${nome}<span class="coluna-contagem">${ids.length}</span></div>
    ${ids.map((id) => htmlDoCard(id, 'boards-card')).join('')}
  </div>`,
  )
  .join('')}
</div></div>`;
}

function cenaTaskboard(): string {
  const colunas: Array<[string, number[]]> = [
    ['To Do', [1210, 1212]],
    ['In Progress', [1211]],
    ['Done', [1213]],
  ];
  return `
<header class="topo"><span class="topo-titulo">Sprint 7</span><span class="topo-aba ativa">Taskboard</span><span class="topo-aba">Backlog</span><span class="topo-aba">Capacity</span></header>
<table class="bolt-table taskboard">
  <thead><tr><th>Backlog item</th>${colunas.map(([n]) => `<th>${n}</th>`).join('')}</tr></thead>
  <tbody><tr data-row-index="0">
    <td class="taskboard-parent-cell">${htmlDoCard(1201, 'taskboard-card')}</td>
    ${colunas.map(([, ids]) => `<td>${ids.map((id) => htmlDoCard(id, 'taskboard-card')).join('')}</td>`).join('')}
  </tr></tbody>
</table>`;
}

function cenaCard(): string {
  return `<div class="sozinho">${htmlDoCard(1202, 'boards-card')}</div>`;
}

// --- Montagem com o código real da extensão ----------------------------------

async function montar(): Promise<void> {
  const parametros = new URLSearchParams(location.search);
  const cena = parametros.get('cena') ?? 'board';
  document.documentElement.dataset.tema = parametros.get('tema') === 'escuro' ? 'escuro' : 'claro';
  document.body.classList.add(`cena-${cena}`);

  const raiz = document.getElementById('raiz')!;
  raiz.innerHTML = cena === 'taskboard' ? cenaTaskboard() : cena === 'card' ? cenaCard() : cenaBoard();

  const tipo = cena === 'taskboard' ? 'taskboard' : 'board';
  const cards = acharCards(document, tipo);
  const repo = criarRepositorio(buscar);
  await repo.carregar(
    BASE,
    cards.map((c) => c.id),
    60_000,
  );
  for (const card of cards) {
    const corte = repo.linhasDoCard(card.id, BASE, PROJETO, { maxLinhas: 3, esconderEmCardConcluido: true });
    if (!corte || (corte.visiveis.length === 0 && corte.restantes.length === 0)) continue;
    pontoDeInsercao(card.el).appendChild(montarBloco(document, corte.visiveis, corte.restantes, { abrirEmNovaAba: true }));
  }
  document.body.dataset.pronto = 'sim';
}

void montar();
