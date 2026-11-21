import { describe, expect, it } from 'vitest';
import { normalizarOpcoes, OPCOES_PADRAO } from '../src/opcoes/opcoes';

describe('normalizarOpcoes', () => {
  it('padrão da especificação', () => {
    expect(normalizarOpcoes({})).toEqual({
      ligarNoBoard: true,
      ligarNoTaskboard: true,
      maxLinhas: 3,
      abrirEmNovaAba: true,
      esconderEmCardConcluido: true,
      validadeDoCacheSeg: 60,
    });
    expect(normalizarOpcoes(null)).toEqual(OPCOES_PADRAO);
  });

  it('mantém valores válidos', () => {
    expect(normalizarOpcoes({ ligarNoBoard: false, maxLinhas: 5, validadeDoCacheSeg: 120 })).toMatchObject({
      ligarNoBoard: false,
      maxLinhas: 5,
      validadeDoCacheSeg: 120,
    });
  });

  it('corrige valores fora da faixa ou de tipo errado', () => {
    expect(normalizarOpcoes({ maxLinhas: 0, validadeDoCacheSeg: 1 })).toMatchObject({ maxLinhas: 1, validadeDoCacheSeg: 5 });
    expect(normalizarOpcoes({ maxLinhas: 99, validadeDoCacheSeg: 99999 })).toMatchObject({ maxLinhas: 20, validadeDoCacheSeg: 3600 });
    expect(normalizarOpcoes({ maxLinhas: Number.NaN, ligarNoBoard: 'sim' })).toMatchObject({ maxLinhas: 3, ligarNoBoard: true });
    expect(normalizarOpcoes({ maxLinhas: '4' })).toMatchObject({ maxLinhas: 4 });
  });
});
