import { FORMA_LABEL, saldoCaixa, sinalMovimento } from "@/lib/poker-demo/calc";
import type { Caixa, FormaPagamento } from "@/lib/poker-demo/types";
import { formatCurrency } from "@/lib/format";

const FORMAS: FormaPagamento[] = ["dinheiro", "pix", "cartao"];

/** Entradas, saídas e saldo por forma de pagamento, mais o esperado na gaveta. */
export function CaixaResumo({ caixa }: { caixa: Caixa }) {
  const linhas = FORMAS.map((forma) => {
    const sinais = caixa.movimentos.filter((m) => m.forma === forma).map(sinalMovimento);
    return {
      forma,
      entradas: sinais.filter((v) => v > 0).reduce((soma, v) => soma + v, 0),
      saidas: sinais.filter((v) => v < 0).reduce((soma, v) => soma - v, 0),
      saldo: saldoCaixa(caixa, forma),
    };
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg ring-1 ring-foreground/10">
        <div className="grid grid-cols-4 gap-2 bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <span>Forma</span>
          <span className="text-right">Entradas</span>
          <span className="text-right">Saídas</span>
          <span className="text-right">Saldo</span>
        </div>
        {linhas.map((linha) => (
          <div key={linha.forma} className="grid grid-cols-4 gap-2 border-t px-3 py-2.5">
            <span>{FORMA_LABEL[linha.forma]}</span>
            <span className="text-right font-money text-emerald-400">{formatCurrency(linha.entradas)}</span>
            <span className="text-right font-money text-destructive">{formatCurrency(linha.saidas)}</span>
            <span className="text-right font-money">{formatCurrency(linha.saldo)}</span>
          </div>
        ))}
        <div className="grid grid-cols-4 gap-2 border-t bg-muted/50 px-3 py-2.5 font-medium">
          <span className="col-span-3">Saldo total</span>
          <span className="text-right font-money">{formatCurrency(saldoCaixa(caixa))}</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-lg bg-primary/10 px-3 py-3 ring-1 ring-primary/30">
        <span>
          Esperado na gaveta
          <span className="block text-xs text-muted-foreground">dinheiro em espécie para conferir</span>
        </span>
        <span className="font-money text-2xl text-primary">
          {formatCurrency(saldoCaixa(caixa, "dinheiro"))}
        </span>
      </div>
    </div>
  );
}
