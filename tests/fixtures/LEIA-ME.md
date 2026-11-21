# Fixtures de HTML dos cards

- `taskboard.html`: **HTML real** do taskboard, capturado no spike em 2026-11-21 (nome e avatar do
  responsável trocados por fictícios).
- `board.provisorio.html` e `desconhecido.provisorio.html`: escritos à mão.

Os arquivos `*.provisorio.html` foram escritos à mão, antes do spike, só para exercitar a lógica
de `src/dom/seletores.ts` e `src/dom/bloco.ts`. **Eles não são o HTML real do Azure DevOps.**

No spike:

1. Abra o board (e depois o taskboard) com o DevTools.
2. Rode `scripts/diagnostico-seletores.js` no console. Ele copia para a área de transferência o
   `outerHTML` de dois cards e um resumo dos seletores que casaram.
3. Salve o HTML de cada card como `board.html` e `taskboard.html` nesta pasta, apague os
   `*.provisorio.html` e ajuste `tests/seletores.test.ts` para usar os arquivos novos.
