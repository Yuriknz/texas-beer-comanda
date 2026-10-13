"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { FileQuestion, ReceiptText, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContaFecharDialog } from "@/components/poker/conta-fechar-dialog";
import { ContaProdutoDialog } from "@/components/poker/conta-produto-dialog";
import { ContaValorDialog } from "@/components/poker/conta-valor-dialog";
import { PageTitle } from "@/components/poker/page-title";
import { FORMA_LABEL, totalConsumo, totalConta, totalLancamento } from "@/lib/poker-demo/calc";
import { usePoker } from "@/lib/poker-demo/store";
import type { Lancamento, LancamentoTipo } from "@/lib/poker-demo/types";
import { formatCurrency, formatDateTime, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const TIPO: Record<LancamentoTipo, { label: string; className: string }> = {
  produto: { label: "Bar", className: "bg-secondary text-secondary-foreground" },
  cacife: { label: "Cacife", className: "bg-primary/15 text-primary" },
  devolucao: { label: "Devolução", className: "bg-emerald-500/15 text-emerald-400" },
  torneio: { label: "Torneio", className: "bg-sky-500/15 text-sky-300" },
  premio: { label: "Prêmio", className: "bg-emerald-500/15 text-emerald-400" },
};

// inscrição, rebuy e prêmio só se desfazem pela tela do torneio
const REMOVIVEIS: LancamentoTipo[] = ["produto", "cacife", "devolucao"];

export default function ContaPage() {
  const { contaId } = useParams<{ contaId: string }>();
  const { state, actions } = usePoker();
  const [remover, setRemover] = useState<Lancamento | null>(null);

  const conta = state.contas.find((c) => c.id === contaId);

  if (!conta) {
    return (
      <>
        <PageTitle title="Conta não encontrada" />
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <FileQuestion className="size-10" />
          <span>Esta conta não existe ou os dados de demonstração foram reiniciados.</span>
          <Link href="/poker" className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4")}>
            Voltar para as contas abertas
          </Link>
        </div>
      </>
    );
  }

  const jogador = state.jogadores.find((j) => j.id === conta.jogadorId);
  const jogadorNome = jogador?.nome ?? "Jogador";
  const aberta = conta.status === "aberta";
  const total = totalConta(conta);
  const consumo = totalConsumo(conta);
  const poker = total - consumo;
  const nota = conta.notaId ? state.notas.find((n) => n.id === conta.notaId) : undefined;
  const lancamentos = [...conta.lancamentos].sort((a, b) => b.em.localeCompare(a.em));

  function confirmarRemocao() {
    if (!remover || !conta) return;
    const resultado = actions.removerLancamento(conta.id, remover.id);
    if (resultado.ok) toast.success(`“${remover.descricao}” removido da conta.`);
    else toast.error(resultado.error);
    setRemover(null);
  }

  return (
    <>
      <PageTitle
        title={jogadorNome}
        description={`Conta #${conta.numero} · aberta em ${formatDateTime(conta.abertaEm)}${
          jogador?.apelido ? ` · “${jogador.apelido}”` : ""
        }`}
      >
        <Badge
          className={cn(
            "h-7 px-3 text-sm",
            aberta ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          {aberta ? "Aberta" : "Fechada"}
        </Badge>
      </PageTitle>

      <Card className="gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-heading text-sm tracking-wide text-muted-foreground uppercase">
            {total < 0 ? "A pagar ao jogador" : aberta ? "Total da conta" : "Total pago"}
          </div>
          <div
            className={cn(
              "font-money text-5xl leading-tight",
              total < 0 ? "text-emerald-400" : "text-primary"
            )}
          >
            {formatCurrency(Math.abs(total))}
          </div>
        </div>
        <dl className="flex gap-6 sm:text-right">
          <div>
            <dt className="text-xs text-muted-foreground">Consumo de bar</dt>
            <dd className="font-money text-lg">{formatCurrency(consumo)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Poker</dt>
            <dd className={cn("font-money text-lg", poker < 0 && "text-emerald-400")}>
              {formatCurrency(poker)}
            </dd>
          </div>
        </dl>
      </Card>

      {aberta ? (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <ContaProdutoDialog contaId={conta.id} />
          <ContaValorDialog tipo="cacife" jogadorId={conta.jogadorId} />
          <ContaValorDialog tipo="devolucao" jogadorId={conta.jogadorId} />
          <ContaFecharDialog conta={conta} jogadorNome={jogadorNome} />
        </div>
      ) : (
        <Card className="gap-3 p-4">
          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Forma de pagamento</dt>
              <dd className="text-base font-medium">
                {conta.formaPagamento ? FORMA_LABEL[conta.formaPagamento] : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Fechada em</dt>
              <dd className="text-base font-medium">
                {conta.fechadaEm ? formatDateTime(conta.fechadaEm) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Nota fiscal</dt>
              <dd className="text-base font-medium">
                {nota ? (
                  <span className="flex flex-wrap items-center gap-2">
                    NFC-e nº {nota.numero}
                    <span className="font-money text-muted-foreground">
                      {formatCurrency(nota.valor)}
                    </span>
                    <Badge variant={nota.status === "autorizada" ? "secondary" : "destructive"}>
                      {nota.status === "autorizada" ? "Autorizada" : "Cancelada"}
                    </Badge>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {consumo > 0 ? "Não emitida" : "Sem consumo de bar"}
                  </span>
                )}
              </dd>
            </div>
          </dl>
          {(nota || consumo > 0) && (
            <Link
              href="/poker/nota-fiscal"
              className={cn(buttonVariants({ variant: "outline" }), "h-11 self-start px-4")}
            >
              <ReceiptText /> {nota ? "Ver em Nota Fiscal" : "Emitir em Nota Fiscal"}
            </Link>
          )}
        </Card>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-lg">
          Lançamentos{" "}
          <span className="text-sm text-muted-foreground">({conta.lancamentos.length})</span>
        </h3>
        {lancamentos.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">
            {aberta ? "Conta vazia. Lance um produto ou um cacife." : "Conta sem lançamentos."}
          </p>
        ) : (
          <Card className="gap-0 divide-y divide-border py-0">
            {lancamentos.map((lancamento) => {
              const valor = totalLancamento(lancamento);
              const credito = valor < 0;
              const tipo = TIPO[lancamento.tipo];
              return (
                <div key={lancamento.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Badge className={tipo.className}>{tipo.label}</Badge>
                      <span className="font-medium">{lancamento.descricao}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      <span className="font-money">
                        {lancamento.quantidade} × {formatCurrency(lancamento.valorUnitario)}
                      </span>{" "}
                      · {formatTime(lancamento.em)}
                    </div>
                  </div>
                  <div className={cn("font-money text-lg", credito && "text-emerald-400")}>
                    {formatCurrency(valor)}
                  </div>
                  {aberta &&
                    (REMOVIVEIS.includes(lancamento.tipo) ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-11 text-muted-foreground hover:text-destructive"
                        aria-label={`Remover ${lancamento.descricao}`}
                        onClick={() => setRemover(lancamento)}
                      >
                        <Trash2 className="size-5" />
                      </Button>
                    ) : (
                      // mantém os valores alinhados nas linhas sem botão
                      <span className="size-11 shrink-0" aria-hidden />
                    ))}
                </div>
              );
            })}
          </Card>
        )}
      </section>

      <Dialog
        open={remover !== null}
        onOpenChange={(open) => {
          if (!open) setRemover(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover lançamento?</DialogTitle>
            <DialogDescription>
              {remover &&
                `${remover.descricao} — ${formatCurrency(totalLancamento(remover))} sai da conta de ${jogadorNome}.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-4" onClick={() => setRemover(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" className="h-11 px-4" onClick={confirmarRemocao}>
              <Trash2 /> Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
