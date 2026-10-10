"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { encerrarTorneio } from "./actions";

export function EncerrarTorneioDialog({
  torneioId,
  totalArrecadado,
  rakeSugerido,
  totalPago,
}: {
  torneioId: string;
  totalArrecadado: number;
  rakeSugerido: number;
  totalPago: number;
}) {
  const [open, setOpen] = useState(false);
  const [rakeTotal, setRakeTotal] = useState(rakeSugerido);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const saldo = totalArrecadado - rakeTotal - totalPago;

  function handleEncerrar() {
    startTransition(async () => {
      const result = await encerrarTorneio(torneioId, rakeTotal);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Torneio encerrado");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="w-full" />}>Encerrar torneio</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encerrar torneio</DialogTitle>
          <DialogDescription>Confira o caixa antes de encerrar. Depois disso nada mais pode ser lançado.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Total arrecadado</span>
            <span className="font-money">{formatCurrency(totalArrecadado)}</span>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rake-total">Taxa da casa</Label>
            <Input
              id="rake-total"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={rakeTotal}
              onChange={(event) => setRakeTotal(Number(event.target.value) || 0)}
            />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground">Prêmios pagos</span>
            <span className="font-money">{formatCurrency(totalPago)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-border/50 pt-3">
            <span className="font-medium">Diferença no caixa</span>
            <span className={`font-money text-lg ${Math.abs(saldo) < 0.01 ? "text-primary" : "text-destructive"}`}>
              {formatCurrency(saldo)}
            </span>
          </div>
          {Math.abs(saldo) >= 0.01 && (
            <p className="text-xs text-muted-foreground">
              Arrecadado − taxa − prêmios deveria fechar em zero. Confira antes de confirmar.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button disabled={isPending} onClick={handleEncerrar}>
            {isPending ? "Encerrando…" : "Confirmar encerramento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
