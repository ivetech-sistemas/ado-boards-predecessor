/**
 * Base da coleção e tipo de página, a partir da URL da página.
 *
 * | URL da página                                              | Base                                       |
 * | ---------------------------------------------------------- | ------------------------------------------ |
 * | https://dev.azure.com/{org}/{projeto}/...                  | https://dev.azure.com/{org}                |
 * | https://{org}.visualstudio.com/DefaultCollection/{proj}/...| https://{org}.visualstudio.com/DefaultCollection |
 * | https://{org}.visualstudio.com/{projeto}/...               | https://{org}.visualstudio.com             |
 */

export interface Colecao {
  /** Base da coleção, sem barra no fim. Ex.: https://dev.azure.com/minhaorg */
  base: string;
  /** Projeto da página, já decodificado. Pode faltar em páginas da organização. */
  projeto?: string;
}

export type TipoDePagina = 'board' | 'taskboard';

const DEFAULT_COLLECTION = 'defaultcollection';

function decodificar(segmento: string): string {
  try {
    return decodeURIComponent(segmento);
  } catch {
    return segmento;
  }
}

export function colecaoDaUrl(href: string): Colecao | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;

  const host = url.hostname.toLowerCase();
  const segmentos = url.pathname.split('/').filter(Boolean);

  if (host === 'dev.azure.com') {
    const [org, projeto] = segmentos;
    if (!org) return null;
    return comProjeto(`${url.origin}/${org}`, projeto);
  }

  if (host.endsWith('.visualstudio.com')) {
    const [primeiro, segundo] = segmentos;
    if (primeiro && primeiro.toLowerCase() === DEFAULT_COLLECTION) {
      return comProjeto(`${url.origin}/${primeiro}`, segundo);
    }
    return comProjeto(url.origin, primeiro);
  }

  return null;
}

function comProjeto(base: string, projeto: string | undefined): Colecao {
  // Segmentos que começam com "_" (_apis, _boards, _sprints...) não são projeto.
  if (!projeto || projeto.startsWith('_')) return { base };
  return { base, projeto: decodificar(projeto) };
}

export function tipoDePagina(pathname: string): TipoDePagina | null {
  const caminho = pathname.toLowerCase();
  if (caminho.includes('/_boards/board/')) return 'board';
  if (caminho.includes('/_sprints/taskboard/')) return 'taskboard';
  return null;
}

/** Link para abrir o work item: {base}/{projeto}/_workitems/edit/{id} */
export function linkDoWorkItem(base: string, projeto: string, id: number): string {
  return `${base}/${encodeURIComponent(projeto)}/_workitems/edit/${id}`;
}
