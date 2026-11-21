<p align="center">
  <img src="icons/icon128.png" width="96" height="96" alt="">
</p>

<h1 align="center">Predecessores no card</h1>

<p align="center">
  Extensão para Edge e Chrome que mostra, dentro dos cards do <strong>Azure Boards</strong>,
  os predecessores que ainda não foram concluídos.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/licen%C3%A7a-MIT-blue.svg" alt="Licença MIT"></a>
  <img src="https://img.shields.io/badge/Manifest-V3-informational.svg" alt="Manifest V3">
  <img src="https://img.shields.io/badge/Edge%20%7C%20Chrome-suportado-success.svg" alt="Edge e Chrome">
</p>

---

No Azure Boards, a dependência entre itens (o link **Predecessor**) só aparece quando você abre o
item. Esta extensão desenha no próprio card, no **board** (Kanban) e no **taskboard** da sprint,
uma linha por predecessor em aberto:

```
▍ 7887  Cadastro de cupons de desconto
▍ ● New
▍ Effort 14
▍ ─────────────────────────────────────
▍ ← ● (MS) Criar API de clientes…
▍ ← ● (JL) Modelo de dados de assinatu…
```

- **←** o card depende deste item;
- **●** cor do estado do predecessor no processo do time (nome do estado no tooltip);
- **foto** do responsável, ou as iniciais; sem responsável, um espaço em branco para manter o alinhamento;
- **título** em uma linha. O clique abre o predecessor numa nova aba sem abrir o card nem iniciar o arrastar.

Predecessor concluído não aparece. Se o predecessor for movido para Done, a linha some sozinha.

*English: a Chromium (Edge/Chrome) extension that shows, inside Azure Boards cards (Kanban board
and sprint taskboard), the predecessors (`Dependency-Reverse` links) that are not done yet: state
color, assignee avatar and a clickable title. No data leaves Azure DevOps.*

## Recursos

- Board de qualquer nível (Epics, Features, Backlog items) e taskboard da sprint.
- "Concluído" avaliado pela **categoria** do estado (`Completed` ou `Removed`), não pelo nome. Funciona
  em qualquer processo (Scrum, Agile, CMMI, herdado) e em qualquer idioma.
- Predecessores de **outros projetos** da mesma organização.
- Predecessor sem permissão de leitura aparece só como `#id`.
- No máximo 3 linhas por card (configurável), com "+K" e um tooltip listando os restantes.
- Card concluído não mostra predecessores (configurável).
- `dev.azure.com/{org}` e `{org}.visualstudio.com` (com ou sem `DefaultCollection`).
- Tema claro e escuro, pelas variáveis de tema do próprio Azure DevOps.
- Leve: lotes de até 200 itens por requisição, no máximo 2 requisições simultâneas e cache em memória.

## Privacidade

- Os dados vêm direto da API do Azure DevOps da sua organização, **com a sua própria sessão**, do
  mesmo jeito que a página faz. Não há PAT nem credencial guardada.
- **Nada sai do Azure DevOps**: não há servidor da extensão, telemetria nem anúncios.
- Permissões: só `storage` (para as opções) e os domínios `dev.azure.com` e `*.visualstudio.com`.

Detalhes em [PRIVACIDADE.md](PRIVACIDADE.md).

## Instalação

### Pela loja

O link da Chrome Web Store entra aqui quando a extensão for publicada. No Edge, o mesmo link
funciona: na primeira vez, clique em **Permitir extensões de outras lojas**.

### A partir do código

Pré-requisito: [Node.js](https://nodejs.org/) 20 ou mais novo.

```bash
git clone https://github.com/ivetech-sistemas/ado-boards-predecessor.git
cd ado-boards-predecessor
npm install
npm run build
```

1. Abra `edge://extensions` (ou `chrome://extensions`).
2. Ligue o **Modo de desenvolvedor**.
3. Clique em **Carregar sem compactação** e escolha a pasta **`dist`**.
4. Abra (ou recarregue) um board ou taskboard do Azure DevOps.

## Opções

No menu de extensões do navegador, clique com o botão direito em **Predecessores no card** e
escolha **Opções**. As mudanças valem na hora para as abas abertas.

| Opção | Padrão |
| --- | --- |
| Ligar no board | sim |
| Ligar no taskboard | sim |
| Máximo de linhas por card | 3 |
| Abrir o predecessor em nova aba | sim (Ctrl+clique e o botão do meio sempre abrem em nova aba) |
| Esconder em card concluído | sim |
| Validade do cache (s) | 60 |

## Limitações conhecidas

- **Mudança na tela do Azure DevOps.** O Azure DevOps não oferece ponto de extensão dentro do card,
  então a extensão acrescenta o bloco à tela nativa. Se a Microsoft mudar o HTML do card, o bloco
  some (o board continua funcionando normalmente) até `src/dom/seletores.ts` ser atualizado. Nesse
  caso, a extensão avisa no console com o prefixo `[predecessores]`.
- **Fora do escopo por enquanto:** sucessores, backlog em lista, consultas, Delivery Plans e Firefox.

## Desenvolvimento

| Comando | O que faz |
| --- | --- |
| `npm run build` | Gera `dist/` |
| `npm run watch` | Build contínuo, com source map |
| `npm test` | Testes (Vitest + jsdom) |
| `npm run typecheck` | TypeScript, sem emitir |
| `npm run zip` | Build + `predecessores-v{versão}.zip`, pronto para a loja |
| `npm run icones` | Regera os ícones em `icons/` |

Depois de mudar o código, rode `npm run build` (ou deixe o `watch` rodando), clique em
**Recarregar** na extensão e recarregue a aba do Azure DevOps.

### Como funciona

1. O content script detecta a página de board ou taskboard, inclusive na navegação interna, sem recarregar.
2. Acha os cards na tela (`.wit-card[data-itemid]`) e observa as mudanças com um `MutationObserver`,
   com debounce de 300 ms.
3. Busca em lote os links `System.LinkTypes.Dependency-Reverse` dos cards visíveis, depois os campos
   dos predecessores e, por fim, as cores e categorias dos estados de cada tipo.
4. Monta o bloco e acrescenta ao fim do `.card-content`, sem alterar nenhum elemento nativo. O card
   decorado recebe `data-ivt-pred="<id>:<hash>"` para não ser redesenhado à toa.

```
src/
  content/index.ts          detecta a página, observa a tela e coordena
  content/dados.ts          cache por ID e montagem das linhas de cada card
  dom/seletores.ts          os ÚNICOS seletores da tela do Azure DevOps
  dom/bloco.ts              monta o bloco de linhas e isola os eventos do card
  api/                      base da coleção, HTTP, work items e estados
  dominio/predecessores.ts  funções puras: relações, filtro de concluídos, corte em N linhas
  opcoes/                   página de opções
  estilos.css               CSS com o prefixo ivt-pred-
scripts/                    build, empacotamento, ícones e diagnóstico de seletores
tests/                      testes e fixtures com o HTML real dos cards
docs/                       especificação, decisões técnicas, roteiro de teste e publicação
```

### Documentação

- [Especificação](docs/especificacao.md)
- [Decisões técnicas e spike](docs/decisoes-tecnicas.md)
- [Roteiro de teste manual](docs/roteiro-de-teste.md)
- [Como publicar na Chrome Web Store](docs/publicacao-chrome-web-store.md)
- [Changelog](CHANGELOG.md)

## Contribuindo

Contribuições são bem-vindas: issues com bugs, sugestões e pull requests.

- **O bloco sumiu depois de uma atualização do Azure DevOps?** Abra o board, cole
  [`scripts/diagnostico-seletores.js`](scripts/diagnostico-seletores.js) no console do DevTools e
  anexe o relatório na issue. Antes, apague nomes e títulos que não possam ser públicos.
- Antes do PR, rode `npm test` e `npm run typecheck`, e siga o
  [roteiro de teste manual](docs/roteiro-de-teste.md) nas telas que a mudança afeta.
- Seletores da tela do Azure DevOps ficam **só** em `src/dom/seletores.ts`.
- Registre a mudança no [CHANGELOG.md](CHANGELOG.md).

## Licença

[MIT](LICENSE) © 2026 Ivetech Sistemas.

Este projeto não é afiliado nem endossado pela Microsoft. Azure DevOps e Azure Boards são marcas da
Microsoft Corporation.
