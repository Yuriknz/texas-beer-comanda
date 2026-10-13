"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CircleCheck, Eye, FileText, Info, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NotaCancelarDialog } from "@/components/poker/nota-cancelar-dialog";
import { NotaCupomDialog } from "@/components/poker/nota-cupom-dialog";
import { PageTitle } from "@/components/poker/page-title";
import { totalConsumo } from "@/lib/poker-demo/calc";
import { usePoker } from "@/lib/poker-demo/store";
import type { Conta, NotaFiscal } from "@/lib/poker-demo/types";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const SEM_CPF = "Consumidor não identificado";

function Indicador({ rotulo, valor, className }: { rotulo: string; valor: string; className?: string }) {
  return (
    <Card className="gap-1 p-4">
      <span className="text-xs text-muted-foreground">{rotulo}</span>
      <span className={cn("font-money text-2xl", className)}>{valor}</span>
    </Card>
  );
}

function StatusBadge({ status }: { status: NotaFiscal["status"] }) {
  return status === "autorizada" ? (
    <Badge className="bg-emerald-500/15 text-emerald-400">Autorizada</Badge>
  ) : (
    <Badge variant="destructive">Cancelada</Badge>
  );
}

export default function NotaFiscalPage() {
  const { state, actions } = usePoker();
  // a nota continua guardada enquanto o Dialog fecha, para o conteúdo não sumir na animação
  const [cupom, setCupom] = useState<{ open: boolean; nota?: NotaFiscal }>({ open: false });
  const [cancelamento, setCancelamento] = useState<{ open: boolean; nota?: NotaFiscal }>({ open: false });

  const notas = [...state.notas].sort((a, b) => b.numero - a.numero);
  const autorizadas = notas.filter((n) => n.status === "autorizada");
  const faturado = autorizadas.reduce((soma, n) => soma + n.valor, 0);
  const pendentes = state.contas
    .filter((c) => c.status === "fechada" && !c.notaId && totalConsumo(c) > 0)
    .sort((a, b) => (b.fechadaEm ?? "").localeCompare(a.fechadaEm ?? ""));

  const numeroDaConta = (contaId: string) => state.contas.find((c) => c.id === contaId)?.numero;

  function emitir(conta: Conta) {
    const resultado = actions.emitirNota(conta.id);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(`NFC-e emitida para a conta #${conta.numero}.`);
  }

  const acoes = (nota: NotaFiscal) => (
    <>
      <Button variant="outline" className="h-11 px-3" onClick={() => setCupom({ open: true, nota })}>
        <Eye /> Ver
      </Button>
      {nota.status === "autorizada" && (
        <Button
          variant="destructive"
          className="h-11 px-3"
          onClick={() => setCancelamento({ open: true, nota })}
        >
          Cancelar
        </Button>
      )}
    </>
  );

  const linkConta = (nota: NotaFiscal) => (
    <Link
      href={`/poker/contas/${nota.contaId}`}
      className={cn(buttonVariants({ variant: "link" }), "h-11 px-1")}
    >
      Conta #{numeroDaConta(nota.contaId) ?? "—"}
    </Link>
  );

  return (
    <>
      <PageTitle title="Nota Fiscal" description="NFC-e do consumo de bar das contas do poker." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Notas autorizadas" valor={String(autorizadas.length)} className="text-emerald-400" />
        <Indicador rotulo="Valor faturado" valor={formatCurrency(faturado)} className="text-primary" />
        <Indicador rotulo="Canceladas" valor={String(notas.length - autorizadas.length)} />
        <Indicador
          rotulo="Contas sem nota"
          valor={String(pendentes.length)}
          className={pendentes.length > 0 ? "text-primary" : undefined}
        />
      </div>

      <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          Neste protótipo a emissão é <strong className="text-foreground">simulada</strong>. No sistema final
          ela usa a integração Focus NFe que já existe no app de comandas. Só o consumo de bar é faturado:
          fichas e torneio não entram na nota.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-lg">Pendentes de emissão</h3>
          <p className="text-sm text-muted-foreground">Contas fechadas com consumo de bar e ainda sem nota.</p>
        </div>
        {pendentes.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-muted-foreground">
            <CircleCheck className="size-5 text-emerald-400" />
            <span>Nenhuma conta aguardando nota.</span>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {pendentes.map((conta) => {
              const jogador = state.jogadores.find((j) => j.id === conta.jogadorId);
              return (
                <Card key={conta.id} className="gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{jogador?.nome ?? "Jogador"}</div>
                      <div className="text-xs text-muted-foreground">
                        Conta #{conta.numero}
                        {conta.fechadaEm && ` · fechada em ${formatDateTime(conta.fechadaEm)}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {jogador?.cpf ? `CPF ${jogador.cpf}` : SEM_CPF}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Consumo</div>
                      <div className="font-money text-xl text-primary">
                        {formatCurrency(totalConsumo(conta))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="h-11 flex-1" onClick={() => emitir(conta)}>
                      <ReceiptText /> Emitir NFC-e
                    </Button>
                    <Link
                      href={`/poker/contas/${conta.id}`}
                      className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4")}
                    >
                      Ver conta
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-lg">Notas emitidas</h3>
          <p className="text-sm text-muted-foreground">{notas.length} nota(s), da mais recente para a mais antiga.</p>
        </div>

        {notas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <FileText className="size-10" />
            <span>Nenhuma nota emitida ainda.</span>
          </div>
        ) : (
          <>
            {/* celular: cartões; a tabela de 8 colunas só cabe bem a partir do tablet */}
            <div className="grid gap-3 md:hidden">
              {notas.map((nota) => (
                <Card key={nota.id} className="gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-money text-base">Nº {nota.numero}</div>
                      <div className="truncate font-medium">{nota.jogadorNome}</div>
                      <div className="text-xs text-muted-foreground">{nota.cpf || SEM_CPF}</div>
                      <div className="text-xs text-muted-foreground">{formatDateTime(nota.emitidaEm)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge status={nota.status} />
                      <span
                        className={cn(
                          "font-money text-xl",
                          nota.status === "cancelada" ? "text-muted-foreground line-through" : "text-primary"
                        )}
                      >
                        {formatCurrency(nota.valor)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {linkConta(nota)}
                    <div className="flex gap-2">{acoes(nota)}</div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="hidden p-2 md:flex">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Jogador</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notas.map((nota) => (
                    <TableRow key={nota.id}>
                      <TableCell className="font-money">{nota.numero}</TableCell>
                      <TableCell>{formatDateTime(nota.emitidaEm)}</TableCell>
                      <TableCell className="font-medium">{nota.jogadorNome}</TableCell>
                      <TableCell className={cn(!nota.cpf && "text-muted-foreground")}>
                        {nota.cpf || SEM_CPF}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-money",
                          nota.status === "cancelada" && "text-muted-foreground line-through"
                        )}
                      >
                        {formatCurrency(nota.valor)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={nota.status} />
                      </TableCell>
                      <TableCell>{linkConta(nota)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">{acoes(nota)}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </section>

      <NotaCupomDialog
        nota={cupom.nota}
        open={cupom.open}
        onOpenChange={(open) => setCupom((atual) => ({ ...atual, open }))}
      />
      <NotaCancelarDialog
        nota={cancelamento.nota}
        open={cancelamento.open}
        onOpenChange={(open) => setCancelamento((atual) => ({ ...atual, open }))}
      />
    </>
  );
}
