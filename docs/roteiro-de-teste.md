# Roteiro de teste manual

Rode antes de cada publicação (veja [publicacao-chrome-web-store.md](publicacao-chrome-web-store.md)).

Com a extensão carregada e o console do DevTools aberto (filtre por `[predecessores]`):

1. **Board de Backlog items:** um PBI com dois predecessores, um In Progress atribuído e um Done.
   O card mostra uma linha só: seta, bolinha na cor do In Progress, foto e título em uma linha.
   O clique abre o predecessor em nova aba e não abre o card.
2. **Predecessor concluído some:** mova esse predecessor para Done e recarregue o board (ou espere
   o cache vencer e volte para a aba). A linha some.
3. **Board de Features** (ou Epics): mesmo comportamento.
4. **Taskboard:** uma task com predecessor aberto mostra a linha do mesmo jeito.
5. **Tema escuro** (Configurações do usuário → Tema): o bloco fica legível.
6. **Card movido de coluna** (arrastando e pelo teclado): a linha continua no card; movido para Done, o bloco some em ~2 s.
7. **Rolagem longa:** num board com muitos cards, os que entram na tela ganham as linhas; arrastar
   continua funcionando e nenhum card fica sobreposto.
8. **Predecessor de outro projeto:** a linha aparece, com a cor do processo do outro projeto, e o
   clique abre no projeto dele.
9. **Predecessor sem responsável:** espaço vazio no lugar da foto, alinhado com as outras linhas.
10. **Predecessor sem permissão:** a linha mostra só a seta e `#id`, sem link.
11. **Mais de 3 predecessores abertos:** 3 linhas e "+K"; o tooltip do "+K" lista os restantes.
12. **Sessão vencida:** com a sessão expirada, o bloco some e o board continua normal.
13. **Domínios:** `{org}.visualstudio.com` (com e sem `DefaultCollection`) e `dev.azure.com/{org}`.
14. **Extensão desligada:** o board fica igual ao nativo.
