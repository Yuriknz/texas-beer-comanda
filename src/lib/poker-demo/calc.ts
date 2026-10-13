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
  const premios = torneio.premiacao.map(
    (percentual) => Math.round(premioLiquido * percentual) / 100
  );
  return { inscritos, ativos, rebuys, addons, arrecadado, taxaCasa, premioLiquido, premios };
}
