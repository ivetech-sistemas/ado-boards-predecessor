# Fixtures de HTML dos cards

- `taskboard.html`: **HTML real** do taskboard, capturado no spike em 2026-11-21 (nome e avatar do
  responsável trocados por fictícios).
- `board.html`: **HTML real** do board de Backlog items, capturado no spike em 2026-11-21 (a coluna
  vazia `data-done="true"` foi acrescentada à mão para os testes de mudança de coluna).
- `sem-data-itemid.provisorio.html` e `desconhecido.provisorio.html`: escritos à mão, para exercitar
  as reservas de `src/dom/seletores.ts` caso a Microsoft tire o `data-itemid` ou as classes.

Para atualizar depois de uma mudança na tela: rode `scripts/diagnostico-seletores.js` no board e
no taskboard, troque o HTML dos cards em `board.html` e `taskboard.html` (anonimizando nomes e
avatares) e ajuste `src/dom/seletores.ts` até `npm test` passar.
