/*
 * Diagnóstico do spike — cole no console do DevTools, numa aba com o BOARD ou o TASKBOARD
 * aberto (com a extensão desligada ou ligada, tanto faz).
 *
 * O que faz (só leitura, nada é enviado para fora do Azure DevOps):
 *   1. Mostra quais seletores candidatos de src/dom/seletores.ts acham cards.
 *   2. Mostra a cadeia de elementos acima do link do primeiro card (tag, classes, role,
 *      atributos data-*, altura), para descobrir o seletor do card e o ponto de inserção.
 *   3. Testa a base da coleção no _apis (com e sem DefaultCollection no visualstudio.com).
 *   4. Copia para a área de transferência um relatório JSON com o outerHTML de 2 cards,
 *      para virar fixture em tests/fixtures/.
 *
 * Depois, cole o relatório na conversa (ou salve o HTML como fixture).
 *
 * Mantenha as listas abaixo iguais às de src/dom/seletores.ts.
 */
(async () => {
  const CANDIDATOS_CARD = [
    '.wit-card',
    '[data-itemid]',
    '[data-item-id]',
    '[data-workitemid]',
    '[data-work-item-id]',
    '.board-tile',
    '.kanban-card',
    '.tbTile',
    '.taskboard-card',
    '[id^="tile-"]',
  ];
  const CANDIDATOS_INSERCAO = ['.wit-card-content', '.card-content', '.tbTileContent', '.board-tile-content'];
  const LINK = 'a[href*="/_workitems/edit/"]';
  const CARD_PELO_LINK = '[role="listitem"], [draggable="true"], [class*="card" i], [class*="tile" i]';

  const resumo = (el) => {
    if (!el || el.nodeType !== 1) return null;
    const attrs = {};
    for (const a of el.attributes) {
      if (a.name === 'class' || a.name === 'style') continue;
      if (a.name.startsWith('data-') || ['id', 'role', 'draggable', 'tabindex', 'aria-label', 'aria-roledescription'].includes(a.name)) {
        attrs[a.name] = a.value.length > 80 ? a.value.slice(0, 80) + '…' : a.value;
      }
    }
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      classes: [...el.classList].join(' '),
      attrs,
      tamanho: `${Math.round(r.width)}x${Math.round(r.height)}`,
      posicao: getComputedStyle(el).position,
    };
  };

  const relatorio = { url: location.href, quando: new Date().toISOString(), seletores: {}, insercao: {}, cadeia: [], api: {}, cards: [] };

  // 1. Seletores candidatos
  for (const s of CANDIDATOS_CARD) {
    try {
      const n = document.querySelectorAll(s).length;
      if (n) relatorio.seletores[s] = n;
    } catch (e) {
      relatorio.seletores[s] = 'inválido: ' + e.message;
    }
  }
  for (const s of CANDIDATOS_INSERCAO) {
    const n = document.querySelectorAll(s).length;
    if (n) relatorio.insercao[s] = n;
  }

  // 2. Cadeia acima do primeiro link de work item que parece estar num card
  const links = [...document.querySelectorAll(LINK)].filter((a) => !a.closest('.ivt-pred-bloco'));
  relatorio.linksDeWorkItem = links.length;
  const idsDosLinks = [...new Set(links.map((a) => (a.getAttribute('href').match(/_workitems\/edit\/(\d+)/i) || [])[1]).filter(Boolean))];
  relatorio.idsDosLinks = idsDosLinks.slice(0, 20);

  const primeiro = links[0];
  if (primeiro) {
    let el = primeiro;
    for (let i = 0; i < 12 && el && el !== document.body; i++, el = el.parentElement) relatorio.cadeia.push(resumo(el));
  } else {
    relatorio.avisoLinks = 'Nenhum link /_workitems/edit/ na tela. O ID do card vem de outro lugar (atributo ou campo ID).';
    // Ajuda: elementos cujo texto é só um número, perto de títulos de card
    const numeros = [...document.querySelectorAll('span, div')]
      .filter((e) => e.children.length === 0 && /^\d{1,7}$/.test((e.textContent || '').trim()))
      .slice(0, 5);
    relatorio.elementosSoNumero = numeros.map((e) => ({ texto: e.textContent.trim(), ...resumo(e), pai: resumo(e.parentElement) }));
  }

  // 3. Cards (pelo primeiro seletor que casou, ou pelo link) e outerHTML de 2 deles
  let cards = [];
  for (const s of CANDIDATOS_CARD) {
    try {
      const achados = [...document.querySelectorAll(s)];
      if (achados.length) {
        cards = achados;
        relatorio.seletorUsado = s;
        break;
      }
    } catch {}
  }
  if (!cards.length) {
    cards = [...new Set(links.map((a) => a.closest(CARD_PELO_LINK)).filter(Boolean))];
    relatorio.seletorUsado = cards.length ? `(reserva pelo link) ${CARD_PELO_LINK}` : '(nenhum)';
  }
  relatorio.totalDeCards = cards.length;
  relatorio.cards = cards.slice(0, 2).map((c) => ({ resumo: resumo(c), outerHTML: c.outerHTML.slice(0, 20000) }));

  // Pistas de virtualização: ancestrais com position absolute/transform e altura fixa
  if (cards[0]) {
    const pistas = [];
    let el = cards[0];
    for (let i = 0; i < 6 && el; i++, el = el.parentElement) {
      const cs = getComputedStyle(el);
      if (cs.position === 'absolute' || cs.transform !== 'none' || el.style.height || el.style.top) {
        pistas.push({ ...resumo(el), styleInline: el.getAttribute('style') });
      }
    }
    relatorio.pistasDeVirtualizacao = pistas;
  }

  // 4. API: base da coleção e autenticação pela mesma origem
  const id = idsDosLinks[0] || (cards[0] && (cards[0].getAttribute('data-itemid') || cards[0].getAttribute('data-item-id')));
  const segs = location.pathname.split('/').filter(Boolean);
  const bases = [];
  if (location.hostname === 'dev.azure.com') bases.push(`${location.origin}/${segs[0]}`);
  else {
    bases.push(location.origin);
    bases.push(`${location.origin}/DefaultCollection`);
  }
  for (const base of bases) {
    const url = `${base}/_apis/wit/workitems?ids=${id || 1}&$expand=relations&errorPolicy=omit&api-version=7.1`;
    try {
      const r = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json', 'X-TFS-FedAuthRedirect': 'Suppress' } });
      let corpo = null;
      try {
        corpo = await r.json();
      } catch {}
      const item = corpo && corpo.value && corpo.value[0];
      relatorio.api[base] = {
        status: r.status,
        tipoDeConteudo: r.headers.get('content-type'),
        itemOk: !!item,
        relacoes: item && item.relations ? item.relations.map((x) => x.rel) : null,
        avatar: item && item.fields && item.fields['System.AssignedTo'] ? !!(item.fields['System.AssignedTo']._links || {}).avatar : null,
      };
    } catch (e) {
      relatorio.api[base] = { erro: String(e) };
    }
  }

  // Variáveis de tema usadas pelo CSS
  const raiz = getComputedStyle(document.body);
  relatorio.tema = Object.fromEntries(
    ['--text-secondary-color', '--text-primary-color', '--border-subtle-color', '--focus-border-color'].map((v) => [v, raiz.getPropertyValue(v).trim() || '(ausente)']),
  );

  console.log('[predecessores] diagnóstico', relatorio);
  const json = JSON.stringify(relatorio, null, 2);
  try {
    // copy() é utilitário do console do DevTools
    copy(json);
    console.log('[predecessores] relatório copiado para a área de transferência (%d caracteres).', json.length);
  } catch {
    console.log(json);
  }
  return relatorio;
})();
