import { sugerirPremiados } from "../torneio";
import type { Caixa, Conta, FormaPagamento, Lancamento, MovimentoCaixa, Torneio } from "./types";

export const FORMA_LABEL: Record<FormaPagamento, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao: "Cartão",
};

export function totalLancamento(lancamento: Lancamento): number {
  return lancamento.quantidade * lancamento.valorUnitario;
}

/** Positivo: jogador deve à casa. Negativo: casa deve ao jogador. */
export function totalConta(conta: Conta): number {
  return conta.lancamentos.reduce((soma, l) => soma + totalLancamento(l), 0);
}

/** Só o consumo de bar entra na NFC-e — fichas e torneio não são venda de mercadoria. */
export function totalConsumo(conta: Conta): number {
  return conta.lancamentos
    .filter((l) => l.tipo === "produto")
    .reduce((soma, l) => soma + totalLancamento(l), 0);
}

export function sinalMovimento(movimento: MovimentoCaixa): number {
  return movimento.tipo === "sangria" || movimento.tipo === "pagamento"
    ? -movimento.valor
    : movimento.valor;
}

export function saldoCaixa(caixa: Caixa, forma?: FormaPagamento): number {
  return caixa.movimentos
    .filter((m) => !forma || m.forma === forma)
    .reduce((soma, m) => soma + sinalMovimento(m), 0);
}

export function resumoTorneio(torneio: Torneio) {
  const inscritos = torneio.inscricoes.length;
  const ativos = torneio.inscricoes.filter((i) => i.status === "ativo").length;
  const rebuys = torneio.inscricoes.reduce((soma, i) => soma + i.rebuys, 0);
  const addons = torneio.inscricoes.filter((i) => i.addon).length;
  const arrecadado =
    inscritos * torneio.buyIn + rebuys * torneio.rebuyValor + addons * torneio.addonValor;
  const taxaCasa = Math.round(arrecadado * torneio.taxaCasaPercentual) / 100;
  const premioLiquido = arrecadado - taxaCasa;
  const percentuais = percentuaisPremiacao(torneio);
  // Mesma regra do módulo /torneios: cada prêmio é arredondado para baixo em
  // reais inteiros (facilita pagar em dinheiro) e a sobra vai para o campeão,
  // então a soma bate exatamente com o prêmio líquido.
  const premios = percentuais.map((percentual) =>
    premioLiquido > 0 ? Math.floor((premioLiquido * percentual) / 100) : 0
  );
  if (premioLiquido > 0) {
    const sobra = premioLiquido - premios.reduce((soma, premio) => soma + premio, 0);
    premios[0] = Math.round((premios[0] + sobra) * 100) / 100;
  }
  return { inscritos, ativos, rebuys, addons, arrecadado, taxaCasa, premioLiquido, percentuais, premios };
}

/**
 * Tabela do bar: meio de cada faixa usada na casa (1º 20–30%, 2º 12–18%,
 * 3º 8–12%, 4º 6–9%, 5º 5–7%, 6º 4–6%). Com N premiados, os N primeiros pesos
 * são reescalados para somar 100%.
 */
const PESOS_TABELA_BAR = [25, 15, 10, 7.5, 6, 5];
export const MAX_PREMIADOS = PESOS_TABELA_BAR.length;

export function percentuaisTabelaBar(premiados: number): number[] {
  const pesos = PESOS_TABELA_BAR.slice(0, Math.min(Math.max(premiados, 1), MAX_PREMIADOS));
  const total = pesos.reduce((soma, peso) => soma + peso, 0);
  const percentuais = pesos.map((peso) => Math.round((peso * 1000) / total) / 10);
  // o arredondamento em 0,1% vai para o campeão, para a soma fechar em 100
  const sobra = 100 - percentuais.reduce((soma, p) => soma + p, 0);
  percentuais[0] = Math.round((percentuais[0] + sobra) * 10) / 10;
  return percentuais;
}

/** Quantas colocações recebem prêmio. */
export function numeroPremiados(torneio: Torneio): number {
  if (!torneio.premiacaoAutomatica) return torneio.premiacao.length;
  return torneio.premiados ?? Math.min(sugerirPremiados(torneio.inscricoes.length), MAX_PREMIADOS);
}

/**
 * Percentual do prêmio líquido por colocação. Na tabela do bar o número de
 * premiados pode mudar até o encerramento, quando a tabela é congelada.
 */
export function percentuaisPremiacao(torneio: Torneio): number[] {
  if (!torneio.premiacaoAutomatica) return torneio.premiacao;
  return percentuaisTabelaBar(numeroPremiados(torneio));
}
