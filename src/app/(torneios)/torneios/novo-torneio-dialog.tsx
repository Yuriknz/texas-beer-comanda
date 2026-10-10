"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarTorneio } from "./actions";

export function NovoTorneioDialog() {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [buyInValor, setBuyInValor] = useState(50);
  const [taxaCasaPercentual, setTaxaCasaPercentual] = useState(15);
  const [isPending, startTransition] = useTransition();

  function handleCriar() {
    startTransition(async () => {
      const result = await criarTorneio({ nome, buyInValor, taxaCasaPercentual });
      if (result && "error" in result) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Novo torneio</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo torneio</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              placeholder="Ex.: Torneio de sexta"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="buyInValor">Buy-in (R$)</Label>
              <Input
                id="buyInValor"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={buyInValor}
                onChange={(event) => setBuyInValor(Number(event.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxaCasaPercentual">Taxa da casa (%)</Label>
              <Input
                id="taxaCasaPercentual"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                value={taxaCasaPercentual}
                onChange={(event) => setTaxaCasaPercentual(Number(event.target.value) || 0)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Rebuy e add-on usam o valor do buy-in como padrão (dá pra ajustar na hora de lançar).
          </p>
        </div>

        <DialogFooter>
          <Button disabled={isPending || !nome.trim()} onClick={handleCriar}>
            {isPending ? "Criando…" : "Criar torneio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
