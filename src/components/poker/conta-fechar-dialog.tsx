"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Banknote, CreditCard, Lock, QrCode, TriangleAlert, type LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FORMA_LABEL, totalConsumo, totalConta } from "@/lib/poker-demo/calc";
import { usePoker } from "@/lib/poker-demo/store";
import type { Conta, FormaPagamento } from "@/lib/poker-demo/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const FORMAS: { forma: FormaPagamento; icon: LucideIcon }[] = [
  { forma: "dinheiro", icon: Banknote },
  { forma: "pix", icon: QrCode },
  { forma: "cartao", icon: CreditCard },
];

export function ContaFecharDialog({ conta, jogadorNome }: { conta: Conta; jogadorNome: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="h-14 border-primary/50 text-base" />}>
        <Lock className="size-5" /> Fechar conta
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fechar conta #{conta.numero}</DialogTitle>
          <DialogDescription>{jogadorNome}</DialogDescription>
        </DialogHeader>
        {/* montado só com o diálogo aberto: os padrões refletem a conta naquele momento */}
        <FecharForm conta={conta} onCancelar={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function FecharForm({ conta, onCancelar }: { conta: Conta; onCancelar: () => void }) {
  const { state, actions } = usePoker();
  const router = useRouter();
  const total = totalConta(conta);
  const consumo = totalConsumo(conta);
  const poker = total - consumo;
  const [forma, setForma] = useState<FormaPagamento>("dinheiro");
  const [emitirNota, setEmitirNota] = useState(consumo > 0);

  // Mesmas travas do store, antecipadas para o operador não descobrir só ao confirmar.
  const torneioAtivo = state.torneios.find(
    (t) =>
      t.status === "em_andamento" &&
      t.inscricoes.some((i) => i.jogadorId === conta.jogadorId && i.status === "ativo")
  );
  const caixaFechado = state.caixa.status !== "aberto";
  const bloqueado = caixaFechado || Boolean(torneioAtivo);

  function confirmar() {
    const resultado = actions.fecharConta(conta.id, forma, emitirNota && consumo > 0);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    const valor =
      resultado.total > 0
        ? `recebido ${formatCurrency(resultado.total)} em ${FORMA_LABEL[forma]}`
        : resultado.total < 0
          ? `pago ${formatCurrency(-resultado.total)} ao jogador em ${FORMA_LABEL[forma]}`
          : "sem valor a receber";
    toast.success(
      `Conta #${conta.numero} fechada — ${valor}.${resultado.notaEmitida ? " NFC-e emitida." : ""}`
    );
    router.push("/poker");
  }

  return (
    <>
      <dl className="grid gap-2 rounded-lg bg-muted/50 p-3">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Consumo de bar</dt>
          <dd className="font-money text-base">{formatCurrency(consumo)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Poker (fichas e torneios)</dt>
          <dd className={cn("font-money text-base", poker < 0 && "text-emerald-400")}>
            {formatCurrency(poker)}
          </dd>
        </div>
        <div className="flex items-end justify-between gap-3 border-t pt-2">
          <dt className="font-heading text-sm tracking-wide uppercase">
            {total < 0 ? "A pagar ao jogador" : "Total a receber"}
          </dt>
          <dd className={cn("font-money text-3xl", total < 0 ? "text-emerald-400" : "text-primary")}>
            {formatCurrency(Math.abs(total))}
          </dd>
        </div>
      </dl>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">
          {total < 0 ? "Como o jogador vai receber" : "Forma de pagamento"}
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {FORMAS.map(({ forma: opcao, icon: Icon }) => (
            <button
              key={opcao}
              type="button"
              aria-pressed={forma === opcao}
              onClick={() => setForma(opcao)}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-1 rounded-lg border text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                forma === opcao
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-muted/40 hover:bg-muted"
              )}
            >
              <Icon className="size-5" />
              {FORMA_LABEL[opcao]}
            </button>
          ))}
        </div>
      </fieldset>

      <label
        className={cn(
          "flex min-h-12 items-center gap-3 rounded-lg border border-border px-3 py-2",
          consumo > 0 ? "cursor-pointer" : "opacity-60"
        )}
      >
        <input
          type="checkbox"
          className="size-5 shrink-0 accent-primary"
          checked={emitirNota && consumo > 0}
          disabled={consumo <= 0}
          onChange={(event) => setEmitirNota(event.target.checked)}
        />
        <span className="flex flex-col">
          <span className="font-medium">Emitir NFC-e do consumo</span>
          <span className="text-xs text-muted-foreground">
            {consumo > 0
              ? `Nota de ${formatCurrency(consumo)} — fichas e torneio não entram.`
              : "Conta sem consumo de bar para faturar."}
          </span>
        </span>
      </label>

      {bloqueado && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/15 p-3 text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            {caixaFechado ? (
              <>
                O caixa está fechado.{" "}
                <Link href="/poker/caixa" className="underline underline-offset-3">
                  Abra o caixa
                </Link>{" "}
                antes de fechar contas.
              </>
            ) : (
              <>
                Jogador ainda está ativo no torneio “{torneioAtivo?.nome}”. Elimine-o ou encerre o
                torneio antes de fechar a conta.
              </>
            )}
          </span>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" className="h-11 px-4" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="button" className="h-11 px-4" disabled={bloqueado} onClick={confirmar}>
          Confirmar fechamento
        </Button>
      </DialogFooter>
    </>
  );
}
