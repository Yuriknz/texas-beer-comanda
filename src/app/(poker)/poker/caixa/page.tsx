"use client";

import Link from "next/link";
import { Store } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageTitle } from "@/components/poker/page-title";
import { CaixaAbrirDialog, CaixaFecharDialog, CaixaMovimentoDialog } from "@/components/poker/caixa-dialogs";
import { CaixaIndicador } from "@/components/poker/caixa-indicador";
import { CaixaMovimentos } from "@/components/poker/caixa-movimentos";
import { CaixaResumo } from "@/components/poker/caixa-resumo";
import { saldoCaixa, totalConta } from "@/lib/poker-demo/calc";
import { usePoker } from "@/lib/poker-demo/store";
import { formatCurrency, formatDateTime } from "@/lib/format";

export default function CaixaPage() {
  const { state } = usePoker();
  const { caixa } = state;

  if (caixa.status === "fechado") {
    return (
      <>
        <PageTitle title="Meu Caixa" description="O caixa está fechado." />
        <Card className="items-center gap-3 px-4 py-10 text-center">
          <Store className="size-10 text-muted-foreground" />
          <div>
            <h3 className="text-lg">Caixa fechado</h3>
            <p className="text-sm text-muted-foreground">
              Abra o caixa para receber contas e registrar suprimentos e sangrias.
            </p>
          </div>
          <CaixaAbrirDialog />
        </Card>

        {caixa.fechadoEm && (
          <section className="flex flex-col gap-3">
            <div>
              <h3 className="text-xl">Último fechamento</h3>
              <p className="text-sm text-muted-foreground">
                Operador {caixa.operador}
                {caixa.abertoEm && <> · aberto em {formatDateTime(caixa.abertoEm)}</>} · fechado em{" "}
                {formatDateTime(caixa.fechadoEm)}
              </p>
            </div>
            <CaixaResumo caixa={caixa} />
            <h4 className="text-base text-muted-foreground">Movimentos</h4>
            <CaixaMovimentos movimentos={caixa.movimentos} />
          </section>
        )}
      </>
    );
  }

  const abertas = state.contas.filter((conta) => conta.status === "aberta");
  const emAberto = abertas.reduce((soma, conta) => soma + totalConta(conta), 0);
  const sangrias = caixa.movimentos
    .filter((movimento) => movimento.tipo === "sangria")
    .reduce((soma, movimento) => soma + movimento.valor, 0);

  return (
    <>
      <PageTitle
        title="Meu Caixa"
        description={`Operador ${caixa.operador}${caixa.abertoEm ? ` · aberto em ${formatDateTime(caixa.abertoEm)}` : ""}`}
      >
        <CaixaMovimentoDialog tipo="suprimento" />
        <CaixaMovimentoDialog tipo="sangria" />
        <CaixaFecharDialog />
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <CaixaIndicador label="Saldo total" valor={formatCurrency(saldoCaixa(caixa))} tom="destaque" />
        <CaixaIndicador
          label="Dinheiro na gaveta"
          valor={formatCurrency(saldoCaixa(caixa, "dinheiro"))}
          detalhe="fundo + recebimentos − saídas"
        />
        <CaixaIndicador label="Recebido em Pix" valor={formatCurrency(saldoCaixa(caixa, "pix"))} />
        <CaixaIndicador label="Recebido em cartão" valor={formatCurrency(saldoCaixa(caixa, "cartao"))} />
        <CaixaIndicador
          label="Sangrias"
          valor={formatCurrency(sangrias)}
          tom={sangrias > 0 ? "saida" : "padrao"}
        />
        <Link href="/poker" className="rounded-xl">
          <CaixaIndicador
            label="Contas abertas"
            valor={formatCurrency(emAberto)}
            detalhe={`${abertas.length} conta(s) a receber`}
            className="h-full transition-all hover:ring-primary/40"
          />
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-xl">Movimentos</h3>
        <CaixaMovimentos movimentos={caixa.movimentos} />
      </section>
    </>
  );
}
