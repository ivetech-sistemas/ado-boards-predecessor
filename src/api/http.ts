/**
 * GET JSON no _apis da mesma origem, com o cookie da sessão do usuário.
 * Sem PAT e sem credencial guardada. No máximo 2 requisições simultâneas.
 */

export class SessaoVencida extends Error {
  constructor() {
    super('Sessão do Azure DevOps vencida (401).');
    this.name = 'SessaoVencida';
  }
}

export class ErroHttp extends Error {
  constructor(public readonly status: number, url: string) {
    super(`HTTP ${status} em ${url}`);
    this.name = 'ErroHttp';
  }
}

/** Semáforo simples: no máximo `limite` tarefas rodando ao mesmo tempo. */
export function criarLimitador(limite: number) {
  let ativos = 0;
  const fila: Array<() => void> = [];

  const liberar = () => {
    ativos--;
    fila.shift()?.();
  };

  return async function limitar<T>(tarefa: () => Promise<T>): Promise<T> {
    if (ativos >= limite) await new Promise<void>((resolve) => fila.push(resolve));
    ativos++;
    try {
      return await tarefa();
    } finally {
      liberar();
    }
  };
}

const limitar = criarLimitador(2);

export type Buscador = (url: string) => Promise<unknown>;

/** Buscador padrão, usado pelo content script. Testes injetam outro. */
export const buscarJson: Buscador = (url) =>
  limitar(async () => {
    const resposta = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        // Sessão vencida devolve 401 em vez de redirecionar para o login.
        'X-TFS-FedAuthRedirect': 'Suppress',
      },
    });
    if (resposta.status === 401) throw new SessaoVencida();
    if (!resposta.ok) throw new ErroHttp(resposta.status, url);
    return resposta.json();
  });
