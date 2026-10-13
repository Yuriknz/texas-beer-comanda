"use client";

import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePoker } from "@/lib/poker-demo/store";
import type { NotaFiscal } from "@/lib/poker-demo/types";
import { formatCurrency } from "@/lib/format";

export function NotaCancelarDialog({
  nota,
  open,
  onOpenChange,
}: {
  nota?: NotaFiscal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { actions } = usePoker();

  function confirmar() {
    if (!nota) return;
    const resultado = actions.cancelarNota(nota.id);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(`NFC-e nº ${nota.numero} cancelada.`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar NFC-e{nota ? ` nº ${nota.numero}` : ""}?</DialogTitle>
          <DialogDescription>
            {nota && (
              <>
                Nota de <span className="font-money text-foreground">{formatCurrency(nota.valor)}</span> em
                nome de {nota.jogadorNome}. O cancelamento não pode ser desfeito; a conta volta para a lista
                de pendentes e pode receber uma nova nota.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" className="h-11 px-4" />}>Manter nota</DialogClose>
          <Button variant="destructive" className="h-11 px-4" onClick={confirmar}>
            Cancelar nota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
