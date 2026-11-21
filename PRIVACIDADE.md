# Política de privacidade — Predecessores no card (Azure Boards)

Última atualização: 21 de novembro de 2026.

A extensão "Predecessores no card" mostra, nos cards do board e do taskboard do Azure Boards, os
predecessores ainda não concluídos de cada work item.

## Que dados a extensão usa

Para desenhar as linhas, a extensão lê, **no seu navegador**, dados do Azure DevOps que você já tem
permissão para ver:

- o ID dos cards visíveis na tela;
- os links de predecessor desses cards;
- o título, o tipo, o estado, o projeto e o responsável (nome e foto) de cada predecessor;
- as cores e as categorias dos estados do processo.

Essas leituras são feitas direto na API do Azure DevOps da sua organização (`dev.azure.com` ou
`*.visualstudio.com`), com a sua própria sessão, do mesmo jeito que a página do Azure DevOps faz.

## O que a extensão não faz

- **Não envia nenhum dado para fora do Azure DevOps.** Não há servidor da extensão, nem análise de
  uso, nem telemetria, nem anúncios.
- **Não guarda credenciais.** Não usa token de acesso pessoal (PAT) e não lê cookies.
- **Não vende nem compartilha dados** com terceiros.
- **Não guarda os dados dos work items.** Eles ficam só na memória da aba, por poucos minutos, e
  somem quando a aba é fechada.

## O que fica salvo

Só as suas preferências da página de opções (por exemplo, o máximo de linhas por card), em
`chrome.storage.sync`. Se você tiver a sincronização do navegador ligada, o navegador as sincroniza
entre os seus dispositivos. Nenhum dado de work item é salvo.

## Permissões

- `storage`: salvar as preferências da página de opções.
- Acesso a `https://dev.azure.com/*` e `https://*.visualstudio.com/*`: desenhar as linhas nos cards
  e ler os dados dos predecessores na API do Azure DevOps.

## Contato

Dúvidas sobre esta política: abra uma issue no repositório da extensão ou fale com a Ivetech.
