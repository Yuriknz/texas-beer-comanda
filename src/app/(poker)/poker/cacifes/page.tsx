"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Coins, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageTitle } from "@/components/poker/page-title";
import { CacifeJogadorPicker } from "@/components/poker/cacife-jogador-picker";
import { CaixaIndicador } from "@/components/poker/caixa-indicador";
import { ValorInput, parseValor } from "@/components/poker/caixa-valor-input";
import { totalLancamento } from "@/lib/poker-demo/calc";
import { usePoker } from "@/lib/poker-demo/store";
import type { Conta } from "@/lib/poker-demo/types";
import { formatCurrency, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const ATALHOS = [50, 100, 200, 500];

/** Fichas compradas e devolvidas numa conta (ambos positivos). */
function fichasDaConta(conta: Conta) {
  let comprou = 0;
  let devolveu = 0;
  for (const lancamento of conta.lancamentos) {
    if (lancamento.tipo === "cacife") comprou += totalLancamento(lancamento);
    if (lancamento.tipo === "devolucao") devolveu -= totalLancamento(lancamento);
  }
  return { comprou, devolveu, saldo: comprou - devolveu };
}

export default function CacifesPage() {
  const { state, actions } = usePoker();
  const [jogadorId, setJogadorId] = useState<string | null>(null);
  const [valor, setValor] = useState("");

  const nomeDe = (id: string) => state.jogadores.find((j) => j.id === id)?.nome ?? "Jogador";
  const contasAbertas = state.contas.filter((conta) => conta.status === "aberta");

  const lancamentos = state.contas
    .flatMap((conta) =>
      conta.lancamentos
        .filter((l) => l.tipo === "cacife" || l.tipo === "devolucao")
        .map((lancamento) => ({ conta, lancamento }))
    )
    .sort((a, b) => b.lancamento.em.localeCompare(a.lancamento.em));

  const totais = state.contas.map(fichasDaConta);
  const vendido = totais.reduce((soma, t) => soma + t.comprou, 0);
  const devolvido = totais.reduce((soma, t) => soma + t.devolveu, 0);

  const porJogador = contasAbertas
    .map((conta) => ({ conta, ...fichasDaConta(conta) }))
    .filter((linha) => linha.comprou > 0 || linha.devolveu > 0)
    .sort((a, b) => nomeDe(a.conta.jogadorId).localeCompare(nomeDe(b.conta.jogadorId)));

  function lancar(tipo: "cacife" | "devolucao") {
    if (!jogadorId) {
      toast.error("Escolha o jogador.");
      return;
    }
    const numero = parseValor(valor);
    const resultado =
      tipo === "cacife" ? actions.lancarCacife(jogadorId, numero) : actions.lancarDevolucao(jogadorId, numero);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(
      tipo === "cacife"
        ? `Cacife de ${formatCurrency(numero)} lançado para ${nomeDe(jogadorId)}.`
        : `Devolução de ${formatCurrency(numero)} creditada para ${nomeDe(jogadorId)}.`
    );
    // limpa tudo para o próximo lançamento não cair no jogador anterior por engano
    setJogadorId(null);
    setValor("");
  }

  return (
    <>
      <PageTitle title="Cacifes" description="Compra e devolução de fichas do cash game." />

      <Card className="gap-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cacife-jogador">Jogador</Label>
            <CacifeJogadorPicker
              jogadores={state.jogadores}
              contasAbertas={contasAbertas}
              selecionadoId={jogadorId}
              onSelect={setJogadorId}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cacife-valor">Valor</Label>
            <div className="grid grid-cols-4 gap-2">
              {ATALHOS.map((atalho) => (
                <Button
                  key={atalho}
                  type="button"
                  variant={parseValor(valor) === atalho ? "default" : "outline"}
                  className="h-12 px-1 font-money text-base"
                  onClick={() => setValor(String(atalho))}
                >
                  R$ {atalho}
                </Button>
              ))}
            </div>
            <ValorInput id="cacife-valor" value={valor} onChange={setValor} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" className="h-12 text-base" onClick={() => lancar("cacife")}>
                <Coins /> Lançar cacife
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 text-base"
                onClick={() => lancar("devolucao")}
              >
                <Undo2 /> Devolução de fichas
              </Button>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          O valor vai para a conta do jogador e só é acertado (dinheiro, Pix ou cartão) no fechamento da conta.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <CaixaIndicador label="Cacifes vendidos" valor={formatCurrency(vendido)} />
        <CaixaIndicador
          label="Devolvido"
          valor={formatCurrency(devolvido)}
          tom={devolvido > 0 ? "entrada" : "padrao"}
        />
        <CaixaIndicador
          label="Fichas em jogo"
          valor={formatCurrency(vendido - devolvido)}
          detalhe="vendidos − devolvidos"
          tom="destaque"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-xl">Jogadores com conta aberta</h3>
          <p className="text-sm text-muted-foreground">Toque em um jogador para lançar para ele.</p>
        </div>
        {porJogador.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">Nenhuma conta aberta com fichas.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {porJogador.map(({ conta, comprou, devolveu, saldo }) => (
              <Card
                key={conta.id}
                className={cn("gap-3 p-4", jogadorId === conta.jogadorId && "ring-primary/60")}
              >
                <button
                  type="button"
                  className="flex flex-col gap-3 text-left"
                  onClick={() => {
                    setJogadorId(conta.jogadorId);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <span className="font-medium">{nomeDe(conta.jogadorId)}</span>
                  <span className="grid grid-cols-3 gap-2">
                    <span className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Comprou</span>
                      <span className="font-money">{formatCurrency(comprou)}</span>
                    </span>
                    <span className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Devolveu</span>
                      <span className="font-money text-emerald-400">{formatCurrency(devolveu)}</span>
                    </span>
                    <span className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Saldo em fichas</span>
                      <span className="font-money text-primary">{formatCurrency(saldo)}</span>
                    </span>
                  </span>
                </button>
                <Link
                  href={`/poker/contas/${conta.id}`}
                  className="py-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-primary"
                >
                  Ver conta #{conta.numero}
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-xl">Lançamentos</h3>
        {lancamentos.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">Nenhum cacife lançado ainda.</p>
        ) : (
          <Card className="gap-0 py-0">
            {lancamentos.map(({ conta, lancamento }) => {
              const total = totalLancamento(lancamento);
              return (
                <div
                  key={lancamento.id}
                  className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
                >
                  <span className="w-12 shrink-0 text-sm text-muted-foreground tabular-nums">
                    {formatTime(lancamento.em)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-medium">{nomeDe(conta.jogadorId)}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={lancamento.tipo === "cacife" ? "default" : "secondary"}>
                        {lancamento.tipo === "cacife" ? "Cacife" : "Devolução"}
                      </Badge>
                      <Link
                        href={`/poker/contas/${conta.id}`}
                        className="py-1 text-xs underline decoration-primary/50 underline-offset-4 hover:text-primary"
                      >
                        Conta #{conta.numero}
                      </Link>
                      <Badge variant={conta.status === "aberta" ? "outline" : "ghost"}>
                        {conta.status === "aberta" ? "Aberta" : "Fechada"}
                      </Badge>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-money text-base whitespace-nowrap",
                      total < 0 ? "text-emerald-400" : "text-primary"
                    )}
                  >
                    {formatCurrency(total)}
                  </span>
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </>
  );
}
