# Predecessores no card (Azure Boards)

Extensão de navegador (Edge e Chrome, Manifest V3) que mostra nos cards do **board** (Kanban) e do
**taskboard** (sprint) do Azure Boards os predecessores ainda não concluídos de cada work item:

```
[←] (●) (foto) Título do predecessor, cortado em uma linha…
```

- **Seta:** "depende de".
- **Bolinha:** cor do estado no processo do time; o nome do estado aparece no tooltip.
- **Foto do responsável:** sem foto, as iniciais; sem responsável, um espaço vazio.
- **Título:** em uma linha, com reticências; o tooltip mostra `#id Tipo — título completo`.
- **Clique:** abre o predecessor (nova aba por padrão) sem abrir o card nem iniciar o arrastar.

O predecessor concluído (estado de categoria `Completed` ou `Removed`) não aparece.
A especificação completa está em [`extensao-predecessores-azure-boards.md`](extensao-predecessores-azure-boards.md).

## Instalação (piloto)

Pré-requisito: Node 20 ou mais novo.

```powershell
npm install
npm run build
```

1. Abra `edge://extensions` (ou `chrome://extensions`).
2. Ligue o **Modo de desenvolvedor**.
3. Clique em **Carregar sem compactação** e escolha a pasta `dist/`.
4. Abra um board ou um taskboard no Azure DevOps e recarregue a página.

Depois de mudar o código, rode `npm run build` (ou deixe `npm run watch` rodando) e clique em
**Recarregar** na extensão. A aba do Azure DevOps também precisa ser recarregada.

Para empacotar (Edge Add-ons ou Chrome Web Store):

```powershell
npm run build
Compress-Archive -Path dist\* -DestinationPath predecessores.zip -Force
```

## Opções

Clique com o botão direito no ícone da extensão e escolha **Opções**. Elas ficam em
`chrome.storage.sync` e valem na hora para as abas abertas.

| Opção | Padrão |
| --- | --- |
| Ligar no board | sim |
| Ligar no taskboard | sim |
| Máximo de linhas por card | 3 (com mais predecessores, aparece "+K", com tooltip listando os restantes) |
| Abrir o predecessor em nova aba | sim (Ctrl+clique e o botão do meio sempre abrem em nova aba) |
| Esconder em card concluído | sim |
| Validade do cache (s) | 60 |

## Como funciona

- **Autenticação:** as chamadas ao `_apis` são da mesma origem da página e usam o cookie da sessão
  (`credentials: 'include'` e `X-TFS-FedAuthRedirect: Suppress`). Não há PAT nem credencial
  guardada. Se a sessão vencer (401), o bloco some até você entrar de novo.
- **Chamadas**, em lotes de até 200 IDs e no máximo 2 simultâneas:
  1. `workitems?ids=…&$expand=relations` para os cards visíveis (links `Dependency-Reverse` e o estado do card);
  2. `workitems?ids=…&fields=…` para os predecessores;
  3. `workitemtypes/{tipo}/states` por projeto e tipo (cor e categoria), em cache enquanto a página estiver aberta.
- **Cache** em memória por ID, com a validade configurada. A tela é reavaliada (debounce de 300 ms)
  quando o board muda, quando você rola, quando volta para a aba e 2 s depois de arrastar um card.
- **Nenhum dado sai do domínio do Azure DevOps** e não há telemetria. Permissões: só `storage` e os
  domínios `dev.azure.com` e `*.visualstudio.com`.

### Estrutura

```
src/
  content/index.ts          detecta a página, observa a tela e coordena
  content/dados.ts          cache por ID e montagem das linhas de cada card
  dom/seletores.ts          os ÚNICOS seletores da tela do Azure DevOps
  dom/bloco.ts              monta o bloco de linhas e isola os eventos do card
  api/base.ts               base da coleção e tipo de página, a partir da URL
  api/http.ts               GET com o cookie da sessão, limite de 2 simultâneas
  api/workitems.ts          lotes de links e de campos
  api/estados.ts            estados do tipo (cor e categoria)
  dominio/predecessores.ts  funções puras: relações, filtro de concluídos, corte em N linhas
  opcoes/                   página de opções e leitura das opções
  estilos.css               CSS com o prefixo ivt-pred- e as variáveis de tema
scripts/
  build.mjs                 esbuild -> dist/
  diagnostico-seletores.js  script do spike, para colar no console do DevTools
tests/                      Vitest (funções puras, API com respostas falsas, bloco e seletores em jsdom)
```

### Comandos

| Comando | O que faz |
| --- | --- |
| `npm run build` | Gera `dist/` |
| `npm run watch` | Build contínuo, com source map |
| `npm test` | Testes (Vitest) |
| `npm run typecheck` | TypeScript sem emitir |

## Spike: decisões e pendências

O código foi escrito antes do spike na tela real. Os itens abaixo precisam ser confirmados num
board e num taskboard autenticados; atualize esta seção com o resultado.

Para fazer o spike, abra o board, cole [`scripts/diagnostico-seletores.js`](scripts/diagnostico-seletores.js)
no console do DevTools e use o relatório que ele copia para a área de transferência.

| Item | Situação | Decisão / o que conferir |
| --- | --- | --- |
| Seletor do card no board | **Pendente** | `src/dom/seletores.ts` tenta, em ordem, `.wit-card`, `[data-itemid]` e variações, `.board-tile`; sem nenhum, sobe do link `/_workitems/edit/` até um elemento com `role="listitem"`, `draggable` ou classe com "card"/"tile". Ajuste a lista com o relatório. |
| Seletor do card no taskboard | **Pendente** | Mesma estratégia, com `.tbTile` e `id="tile-N"`. |
| ID do card | **Pendente** | Atributo de dados → `id="tile-N"` → link do work item → campo ID visível. |
| Ponto de inserção | **Pendente** | Contêiner de conteúdo do card (lista `insercao`), senão o fim do próprio card. O bloco precisa ficar dentro da borda do card. |
| Autenticação pela mesma origem | **Pendente** | O relatório mostra o status de `_apis/wit/workitems` com o cookie. Esperado: 200. |
| `DefaultCollection` no `visualstudio.com` | **Pendente** | A base segue a URL da página (com `DefaultCollection` quando a página tem). O relatório testa com e sem. |
| Altura do card e virtualização | **Pendente** | Conferir num board grande: rolar, arrastar e ver se cards se sobrepõem. Se a virtualização usar altura fixa (o relatório lista as "pistas de virtualização"), trocar as linhas por um ícone com contador e popover, e registrar aqui. |
| Variáveis de tema | **Pendente** | O relatório lista `--text-secondary-color` e afins nos dois temas. Sem elas, o CSS usa `currentColor` como reserva. |
| Observação da tela | Decidido | O `MutationObserver` fica no `body` (com debounce e ignorando as mutações do próprio bloco), porque o contêiner do board é recriado na navegação interna. A troca de URL é detectada por `popstate` e por uma checagem a cada 1 s, já que o `pushState` da página não é visível do mundo isolado do content script. |
| "+K" | Decidido | N linhas de predecessor (padrão 3) e, se houver mais, uma linha extra "+K" com tooltip listando os restantes. |
| Card arrastado para outra coluna | Decidido | O card é redesenhado do cache na hora; 2 s depois do arrastar, o estado dele é relido (para o RF9 valer sem esperar o cache vencer). Mover pelo teclado só atualiza quando o cache vencer. |

Depois do spike, salve o HTML de um card de cada tela em `tests/fixtures/` (veja
[`tests/fixtures/LEIA-ME.md`](tests/fixtures/LEIA-ME.md)) e troque as fixtures provisórias.

## Roteiro de teste manual

Com a extensão carregada e o console do DevTools aberto (filtre por `[predecessores]`):

1. **Board de Backlog items:** um PBI com dois predecessores, um In Progress atribuído e um Done.
   O card mostra uma linha só: seta, bolinha na cor do In Progress, foto e título em uma linha.
   O clique abre o predecessor em nova aba e não abre o card.
2. **Predecessor concluído some:** mova esse predecessor para Done e recarregue o board (ou espere
   o cache vencer e volte para a aba). A linha some.
3. **Board de Features** (ou Epics): mesmo comportamento.
4. **Taskboard:** uma task com predecessor aberto mostra a linha do mesmo jeito.
5. **Tema escuro** (Configurações do usuário → Tema): o bloco fica legível.
6. **Card movido de coluna:** a linha continua no card; movido para Done, o bloco some em ~2 s.
7. **Rolagem longa:** num board com muitos cards, os que entram na tela ganham as linhas; arrastar
   continua funcionando e nenhum card fica sobreposto.
8. **Predecessor de outro projeto:** a linha aparece, com a cor do processo do outro projeto, e o
   clique abre no projeto dele.
9. **Predecessor sem responsável:** espaço vazio no lugar da foto, alinhado com as outras linhas.
10. **Predecessor sem permissão:** a linha mostra só a seta e `#id`, sem link.
11. **Mais de 3 predecessores abertos:** 3 linhas e "+K"; o tooltip do "+K" lista os restantes.
12. **Sessão vencida:** com a sessão expirada, o bloco some e o board continua normal.
13. **Domínios:** `rssoft.visualstudio.com/DefaultCollection` e `dev.azure.com/{org}`.
14. **Extensão desligada:** o board fica igual ao nativo.

## Riscos conhecidos

- **A Microsoft muda a tela do board:** o bloco some (o board continua funcionando) até
  `src/dom/seletores.ts` ser atualizado. Numa página de board sem nenhum card reconhecido, a
  extensão avisa uma vez no console após 8 s.
- **Altura extra do card:** ver a pendência de virtualização acima.

## Licença

MIT. Veja [`LICENSE`](LICENSE).
