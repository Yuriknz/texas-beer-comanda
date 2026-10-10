/**
 * Regras de premiação do torneio. Nada aqui é persistido: o número de
 * premiados e os percentuais são só a sugestão exibida pro operador — o que
 * fica no banco é o valor efetivamente pago (participantes_sessao.valor_cashout).
 */

/** Percentual do prize pool por colocação, indexado pelo número de premiados. */
export const ESTRUTURAS_PREMIACAO: Record<number, number[]> = {
  1: [100],
  2: [65, 35],
  3: [50, 30, 20],
  4: [45, 27, 17, 11],
  5: [40, 25, 16, 11, 8],
  6: [37, 23, 15, 11, 8, 6],
  7: [35, 22, 14, 10, 8, 6, 5],
  8: [33, 21, 13, 10, 8, 6, 5, 4],
  9: [31, 20, 13, 10, 8, 6, 5, 4, 3],
};

export const MAX_PREMIADOS = 9;

/** ~15–20% do field premiado, que é o padrão de torneio de clube. */
export function sugerirPremiados(inscritos: number): number {
  if (inscritos < 4) return 1;
  if (inscritos < 7) return 2;
  if (inscritos < 15) return 3;
  if (inscritos < 22) return 4;
  if (inscritos < 30) return 5;
  if (inscritos < 40) return 6;
  if (inscritos < 50) return 7;
  if (inscritos < 60) return 8;
  return 9;
}

/**
 * Valor de cada colocação arredondado pra baixo em reais inteiros (facilita
 * pagar em dinheiro); a sobra do arredondamento vai pro 1º lugar, então a
 * soma bate exatamente com o prize pool.
 */
export function calcularPremios(prizePool: number, premiados: number): number[] {
  const estrutura = ESTRUTURAS_PREMIACAO[premiados] ?? ESTRUTURAS_PREMIACAO[1];
  if (prizePool <= 0) return estrutura.map(() => 0);

  const premios = estrutura.map((percentual) => Math.floor((prizePool * percentual) / 100));
  const sobra = Math.round((prizePool - premios.reduce((sum, valor) => sum + valor, 0)) * 100) / 100;
  premios[0] = Math.round((premios[0] + sobra) * 100) / 100;
  return premios;
}

export function calcularRake(totalArrecadado: number, taxaCasaPercentual: number): number {
  return Math.round(totalArrecadado * taxaCasaPercentual) / 100;
}
