# Decisões técnicas e spike

O código foi escrito antes de olhar a tela real. O spike (21/11/2026) confirmou os seletores e a API
num board e num taskboard autenticados, e o piloto, carregado sem compactação no Edge, funcionou nas
duas telas.

Quando a Microsoft mudar a tela, refaça o spike: abra o board, cole
[`scripts/diagnostico-seletores.js`](../scripts/diagnostico-seletores.js) no console do DevTools e
use o relatório que ele copia para a área de transferência.

| Item | Situação | Decisão / o que conferir |
| --- | --- | --- |
| Seletor do card no board | **Confirmado** (2026-11-21) | `.wit-card[data-itemid]` (classes `wit-card boards-card`, `role="group"`, `aria-roledescription="Card"`). 41 cards achados no board de Backlog items. A mesma estrutura do taskboard. |
| Seletor do card no taskboard | **Confirmado** (2026-11-21) | `.wit-card[data-itemid]` (classes `wit-card taskboard-card`, `role="group"`, `aria-roledescription="Card"`). 53 cards achados, incluindo os PBIs da coluna dos pais. |
| ID do card | **Confirmado** | `data-itemid` nas duas telas. O título também é um link relativo `/{projeto}/_workitems/edit/{id}`, que serve de reserva. |
| Ponto de inserção | **Confirmado** | `.card-content` (filho direto do card, ao lado da faixa colorida `.card-flag`). O bloco entra no fim: no board, depois das anotações (ex.: "0/6" tasks); no taskboard, depois das tags. Fica fora da área recolhível dos campos (`.scroll-hidden`), então aparece sempre. |
| Autenticação pela mesma origem | **Confirmado** | `_apis/wit/workitems?$expand=relations` devolveu 200 com o cookie da sessão e o `X-TFS-FedAuthRedirect: Suppress`; o `System.AssignedTo` traz `_links.avatar`. |
| `DefaultCollection` no `visualstudio.com` | **Confirmado: opcional** | `{org}.visualstudio.com/_apis` e `{org}.visualstudio.com/DefaultCollection/_apis` devolveram 200 na organização do piloto. A base segue a URL da página. |
| Altura do card e virtualização | **Confirmado no piloto** | Nenhuma das telas mostrou sinal de virtualização com altura fixa, e o piloto não apontou sobreposição. Board: colunas `.kanban-board-column` no fluxo normal, com todos os 41 cards renderizados. Taskboard: tabela `bolt-table` com linhas `tr[data-row-index]` no fluxo normal. A altura extra deve só esticar a coluna ou a linha. Se algum dia aparecer sobreposição, a alternativa é trocar as linhas por um ícone com contador e popover. |
| Variáveis de tema | **Confirmado** (tema escuro) | `--text-secondary-color`, `--text-primary-color`, `--border-subtle-color` e `--focus-border-color` existem. Falta olhar o tema claro na tela. |
| Observação da tela | Decidido | O `MutationObserver` fica no `body` (com debounce e ignorando as mutações do próprio bloco), porque o contêiner do board é recriado na navegação interna. A troca de URL é detectada por `popstate` e por uma checagem a cada 1 s, já que o `pushState` da página não é visível do mundo isolado do content script. |
| "+K" | Decidido | N linhas de predecessor (padrão 3) e, se houver mais, uma linha extra "+K" com tooltip listando os restantes. |
| Card que muda de coluna | Decidido | Board: a coluna vem do `data-column` da `.kanban-board-column`. Quando muda (arrastar, teclado ou outra pessoa), o estado do card é relido 2 s depois, para o Azure DevOps salvar antes. Taskboard (sem `data-column`): o mesmo vale ao detectar o arrastar. O card é redesenhado do cache na hora. |

O HTML real de um card de cada tela está em `tests/fixtures/` (veja
[`tests/fixtures/LEIA-ME.md`](../tests/fixtures/LEIA-ME.md)).
