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

### Pendente

- Spike na tela real: seletores, ponto de inserção, `DefaultCollection` no `_apis` e efeito da
  altura do card na virtualização (ver README).
