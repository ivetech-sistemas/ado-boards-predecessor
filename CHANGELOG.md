# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). A versão segue o
`version` do `manifest.json`.

## [0.1.0] - não publicada

### Adicionado

- Linhas de predecessores em aberto nos cards do board (qualquer nível de backlog) e do taskboard:
  seta, bolinha na cor do estado, foto ou iniciais do responsável e título em uma linha.
- Filtro de predecessor concluído pela categoria do estado (`Completed` ou `Removed`), não pelo nome.
- Card concluído não mostra predecessores (opção).
- Predecessor sem permissão de leitura aparece só com a seta e `#id`.
- No máximo N linhas por card, com "+K" e tooltip listando os restantes.
- Clique abre o predecessor (nova aba ou mesma aba) sem abrir o card nem iniciar o arrastar.
- Predecessor de outro projeto da mesma organização.
- `dev.azure.com/{org}` e `{org}.visualstudio.com` (com e sem `DefaultCollection`).
- Busca em lotes de até 200 IDs, no máximo 2 requisições simultâneas, cache por ID com validade
  configurável e estados do tipo em cache durante a página.
- Página de opções (`chrome.storage.sync`).
- Tema claro e escuro pelas variáveis de tema do Azure DevOps.
- Script de diagnóstico do spike (`scripts/diagnostico-seletores.js`).
- Ícones (16, 32, 48 e 128 px) gerados por `npm run icones`, sem logo de terceiros.
- `npm run zip`: empacota `dist/` para a Chrome Web Store e a Edge Add-ons.
- Política de privacidade (`PRIVACIDADE.md`) e guia de publicação (`docs/publicacao-chrome-web-store.md`).
- README completo para o projeto aberto (licença MIT), com imagens; especificação, decisões técnicas e roteiro de teste em `docs/`.
- `npm run capturas`: gera as imagens do README com o código real da extensão sobre uma demonstração com dados fictícios.

### Spike

- Taskboard confirmado: card `.wit-card[data-itemid]`, inserção em `.card-content`, autenticação
  pela mesma origem e `DefaultCollection` opcional no `_apis`. Fixture real em `tests/fixtures/taskboard.html`.
- Board confirmado: mesma estrutura (`.wit-card[data-itemid]`, classe `boards-card`) e inserção em
  `.card-content`. Fixture real em `tests/fixtures/board.html`.
- Mudança de coluna no board detectada pelo `data-column`, inclusive quando o card é movido pelo teclado.
- Pendente: conferência visual da altura do card, do clique e do arrastar (ver README).
