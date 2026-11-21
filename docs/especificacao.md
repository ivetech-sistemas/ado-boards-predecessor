# Extensão "Predecessores no card" para o Azure Boards

Especificação para construir, num repositório próprio, uma extensão de navegador que mostra nos cards do Azure Boards os predecessores ainda não concluídos de cada work item.

## 1. Objetivo

O time precisa ver, sem abrir o item, que um card depende de outro trabalho ainda em aberto. A extensão acrescenta ao card do **board** (Kanban) e do **taskboard** (sprint) uma linha por predecessor aberto:

```
[←] (●) (foto) Título do predecessor, cortado em uma linha…
```

- **Seta para trás:** ícone que indica "depende de".
- **Estado:** bolinha na cor do estado no processo do time, com o nome do estado no tooltip.
- **Foto do responsável:** quando o item tem alguém atribuído. Sem foto, as iniciais; sem responsável, um espaço vazio do mesmo tamanho, para alinhar as linhas.
- **Título:** cortado em uma linha, com reticências.
- **Link:** a linha inteira abre o predecessor.

Predecessor concluído não aparece, para não poluir a tela.

## 2. Por que extensão de navegador, e não do Azure DevOps

As extensões do marketplace do Azure DevOps só aparecem nos pontos que a plataforma define. Em Boards, esses pontos são:
- o menu do card (`ms.vss-work-web.backlog-board-card-item-menu`);
- os menus do backlog e das consultas;
- as abas e os painéis do backlog;
- um hub no grupo Boards (`ms.vss-work-web.work-hub-group`);
- o formulário do work item.

Nenhum desses pontos desenha conteúdo dentro do card do board ou do taskboard. A lista completa está em <https://learn.microsoft.com/en-us/azure/devops/extend/reference/targets/overview>.

Por isso a solução é uma **extensão de navegador Chromium (Edge e Chrome), Manifest V3**. Um content script acrescenta as linhas aos cards da tela nativa, como já fazem extensões de terceiros que mostram o item pai no card.

**Plano B**, para o caso de não ser possível instalar extensão de navegador: uma extensão do Azure DevOps com a ação "Ver predecessores" no menu do card e um hub "Dependências" em Boards. Esse caminho não faz parte desta especificação.

## 3. Escopo da v1

**Dentro:**
- Board de qualquer nível de backlog (Epics, Features, Backlog items) e taskboard da sprint.
- Predecessores do link `System.LinkTypes.Dependency-Reverse` (o "Predecessor" da tela), inclusive de outro projeto da mesma organização.
- Organização em `https://dev.azure.com/{org}` e em `https://{org}.visualstudio.com`. A Ivetech usa `https://rssoft.visualstudio.com/DefaultCollection`.
- Tema claro e escuro.
- Página de opções.

**Fora:**
- Sucessores (v2, atrás de uma opção).
- Backlog em lista, consultas e Delivery Plans.
- Criar ou remover links pelo card.
- Firefox.

## 4. Requisitos funcionais

| # | Requisito |
| --- | --- |
| RF1 | Detectar a página de board (`/_boards/board/`) e a de taskboard (`/_sprints/taskboard/`), incluindo a navegação interna da aplicação, sem recarregar a página. |
| RF2 | Achar os cards visíveis e o ID de cada um (seção 7). |
| RF3 | Buscar em lote os links de predecessor dos cards visíveis. |
| RF4 | Buscar em lote o título, o tipo, o estado, o responsável e o projeto dos predecessores. |
| RF5 | Esconder o predecessor concluído: estado de **categoria** `Completed` ou `Removed` no processo do tipo dele. Não compare com o nome "Done", que muda por processo e por idioma. |
| RF6 | Desenhar no máximo N linhas por card (padrão 3). Com mais predecessores, mostrar "+K", com tooltip listando os restantes. |
| RF7 | O clique na linha abre `{baseDaColeção}/{projeto}/_workitems/edit/{id}` numa nova aba (opção: mesma aba). O clique não pode abrir o card nem iniciar o arrastar: use `stopPropagation` e `preventDefault` no `pointerdown` e no `click`. |
| RF8 | Atualizar as linhas quando o board recarrega, quando o card muda de coluna, quando aparece um card novo pela rolagem (o board é virtualizado) e quando o usuário volta à aba com o cache vencido. |
| RF9 | Card concluído não mostra predecessores (opção, ligada por padrão). |
| RF10 | Predecessor sem permissão de leitura (a API o omite): mostrar a linha só com a seta e `#id`, sem título, foto nem link. |
| RF11 | Falhar em silêncio: um erro de rede ou de seletor não pode quebrar o board. Registre só um `console.warn` com o prefixo `[predecessores]`. |

## 5. Layout

- Bloco abaixo dos campos do card, com um separador fino em cima.
- Cada linha tem cerca de 18 px de altura, fonte de 12 px e a cor de texto secundária do tema.
- **Ícone:** SVG inline de seta para a esquerda, 12 px.
- **Estado:** bolinha de 8 px com a cor que a API de estados devolve. Tooltip "Estado: <nome>".
- **Foto:** 16 px, redonda, com `title` igual ao nome. Sem foto, círculo com as iniciais.
- **Título:** `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`. Tooltip `#<id> <Tipo> — <título completo>`.
- **Hover:** título sublinhado e cursor de link.
- CSS com o prefixo `ivt-pred-`. Use as variáveis de tema do Azure DevOps (por exemplo `--text-secondary-color`), com valor de reserva, para funcionar no tema claro e no escuro.

## 6. Dados e API

### Autenticação

As chamadas ao `_apis` são da mesma origem da página e usam o cookie da sessão do usuário, como o próprio front do Azure DevOps faz. Não há PAT nem credencial guardada.

Use `credentials: 'include'` e o cabeçalho `X-TFS-FedAuthRedirect: Suppress`. Com esse cabeçalho, a sessão vencida devolve 401 em vez de redirecionar para o login. Nesse caso, não mostre nada.

### Base da coleção, a partir da URL da página

| URL da página | Base |
| --- | --- |
| `https://dev.azure.com/{org}/{projeto}/...` | `https://dev.azure.com/{org}` |
| `https://{org}.visualstudio.com/DefaultCollection/{projeto}/...` | `https://{org}.visualstudio.com/DefaultCollection` |
| `https://{org}.visualstudio.com/{projeto}/...` | `https://{org}.visualstudio.com` |

Cubra as três formas com teste. No spike, confirme se o `DefaultCollection` é obrigatório nas chamadas `_apis` do `visualstudio.com`.

### Chamadas

1. **Links dos cards:**
   `GET {base}/_apis/wit/workitems?ids={até 200 ids}&$expand=relations&errorPolicy=omit&api-version=7.1`
   Em cada item, pegue as `relations` com `rel == "System.LinkTypes.Dependency-Reverse"`. O ID do predecessor é o fim da `url` da relação.
2. **Dados dos predecessores:**
   `GET {base}/_apis/wit/workitems?ids={até 200 ids}&fields=System.Id,System.Title,System.State,System.WorkItemType,System.AssignedTo,System.TeamProject&errorPolicy=omit&api-version=7.1`
   O `fields` não combina com o `$expand`, por isso são duas chamadas.
3. **Estados do tipo (cor e categoria):**
   `GET {base}/{projeto}/_apis/wit/workitemtypes/{tipo}/states?api-version=7.1`
   Devolve `name`, `color` e `category`. Guarde em cache por projeto e tipo enquanto a página estiver aberta.
4. **Foto:** o `System.AssignedTo` vem como identidade, com `displayName`, `uniqueName`, `imageUrl` e `_links.avatar.href`. Use o `_links.avatar.href` no `<img>`; a requisição é da mesma origem, então o cookie vale.

### Desempenho

- Debounce de 300 ms nas mudanças da tela: junte os IDs novos e busque em lote.
- Cache em memória por ID, com validade de 60 s (configurável). Os estados do tipo não vencem durante a página.
- No máximo 2 requisições simultâneas.
- Só busque os cards visíveis.

## 7. Achar os cards na tela

O board e o taskboard usam a interface nova da Microsoft (React) e não oferecem API para os cards. Os seletores precisam ser descobertos na tela real, com o DevTools, no spike, e ficar isolados num único módulo (`src/dom/seletores.ts`) com:
- o seletor do card no board e no taskboard;
- como tirar o ID do card: um atributo de dados, o link `a[href*="/_workitems/edit/"]` ou o campo ID, quando visível;
- o ponto onde inserir o bloco.

Regras:
- **Observar a tela:** use um `MutationObserver` no contêiner do board (`subtree` e `childList`) para pegar os cards que entram, mudam de coluna ou são recriados.
- **Marcar o card decorado:** grave `data-ivt-pred="<id>:<hash dos predecessores>"` no card. Assim ele não é redesenhado à toa e volta a ser decorado quando o React o recria.
- **Não mexer no nativo:** nunca altere elementos nativos; só acrescente o bloco.
- **Avisar quando a tela mudar:** numa página de board em que o seletor não acha nenhum card, avise uma vez no console. É o sinal de que a Microsoft mudou a tela.
- **Validar a altura no spike:** confira se a altura extra do card atrapalha a virtualização ou o arrastar. Se atrapalhar, troque as linhas por um ícone com contador que abre as linhas num popover, e registre a decisão no README.

## 8. Opções

Página de opções, salva em `chrome.storage.sync`:

| Opção | Padrão |
| --- | --- |
| Ligar no board | sim |
| Ligar no taskboard | sim |
| Máximo de linhas por card | 3 |
| Abrir o predecessor em nova aba | sim |
| Esconder em card concluído | sim |
| Validade do cache (s) | 60 |

## 9. Técnica

- TypeScript, Manifest V3 e DOM puro, sem framework de interface (o bloco é pequeno).
- Build com Vite e `@crxjs/vite-plugin`, ou com esbuild. A saída em `dist/` precisa carregar como extensão sem compactação.
- **`manifest.json`:**
  - `content_scripts` em `https://dev.azure.com/*` e `https://*.visualstudio.com/*`, com `run_at: document_idle`;
  - `permissions: ["storage"]`;
  - `host_permissions` só com esses dois domínios;
  - nada de `cookies` nem `tabs`, e service worker só se for necessário.
- Nenhum dado sai do domínio do Azure DevOps, e não há telemetria.

Estrutura sugerida:

```
src/
  content/index.ts          detecta a página, observa a tela e coordena
  dom/seletores.ts          os únicos seletores da tela do Azure DevOps
  dom/bloco.ts              monta o bloco de linhas
  api/base.ts               base da coleção a partir da URL
  api/workitems.ts          lotes de links e de campos
  api/estados.ts            estados do tipo (cor e categoria)
  dominio/predecessores.ts  funções puras: relações, filtro de concluídos, corte em N linhas
  opcoes/                   página de opções
  estilos.css
tests/
manifest.json
README.md                   decisões do spike, instalação e roteiro de teste
CHANGELOG.md
```

## 10. Testes

- **Unitários (Vitest), das funções puras:**
  - a base da coleção nas três formas de URL;
  - a extração dos predecessores das `relations`;
  - o filtro por categoria de estado;
  - o link do work item;
  - o corte em N linhas com o "+K".
- **Bloco (jsdom):** montagem contra HTML de card do board e do taskboard salvo no spike, como fixture.
- **Roteiro manual:**
  - board de Backlog items e de Features, e o taskboard;
  - tema escuro;
  - card movido de coluna e rolagem longa;
  - predecessor de outro projeto, predecessor sem responsável e predecessor sem permissão;
  - sessão vencida.

## 11. Critérios de aceite

1. **Card com um predecessor aberto e outro concluído:** um PBI tem dois predecessores, um In Progress atribuído e um Done. O card mostra uma linha só, com a seta, a bolinha na cor do In Progress, a foto do responsável e o título em uma linha. O clique abre o predecessor numa nova aba e não abre o card.
2. **Predecessor concluído some:** mover esse predecessor para Done e recarregar o board (ou esperar o cache vencer) faz a linha sumir.
3. **Taskboard:** uma task com predecessor aberto mostra a linha do mesmo jeito.
4. **Domínios:** funciona em `rssoft.visualstudio.com/DefaultCollection` e em `dev.azure.com/{org}`.
5. **Board grande:** com 200 cards, a primeira tela é decorada com poucas requisições (lotes de até 200 IDs), e arrastar card continua funcionando.
6. **Sem efeito colateral:** com a extensão desligada ou com erro, o board fica igual ao nativo.
7. **Tema escuro:** o bloco fica legível.

## 12. Distribuição

- **Piloto:** carregar sem compactação, no modo desenvolvedor do Edge ou do Chrome.
- **Time:** publicar como não listada na Edge Add-ons e/ou na Chrome Web Store, ou distribuir pela política do Edge (`ExtensionInstallForcelist`), com a TI.
- Versão no `manifest.json` e mudanças no `CHANGELOG.md`.

## 13. Riscos

| Risco | O que acontece | Mitigação |
| --- | --- | --- |
| A Microsoft muda a tela do board | O bloco some do card (o board continua funcionando) até o `seletores.ts` ser atualizado | Seletores num módulo só, aviso no console e roteiro de teste curto |
| Board muito grande | Muitas requisições | Lotes, cache e busca só dos cards visíveis |
| Altura do card e virtualização | Card sobreposto ou arrastar falhando | Validar no spike; alternativa do ícone com popover |
| Limite de uso da API do Azure DevOps | Chamadas recusadas | Lotes de 200 e cache ficam muito abaixo do limite |

## 14. Relação com o fluxo com IA

- O fluxo grava os links Predecessor entre PBIs e entre Tasks (scripts da `planejar-escopo` e da `replanejar-backlog`). A extensão só lê esses links.
- O fluxo não marca dependência com tag: a extensão é a única forma visual da dependência no board e no taskboard. Por isso ela não pode depender de nenhuma tag nem de nenhum campo extra, só dos links.

## 15. Marcos

1. **Spike:** seletores do board e do taskboard, autenticação pela mesma origem, base da coleção no `visualstudio.com` e efeito da altura do card. As decisões ficam no README.
2. **Board:** linhas no card, sem opções.
3. **Taskboard.**
4. **Acabamento:** opções, tema escuro, "+K" e cache.
5. **Publicação:** empacotar e publicar como não listada.
