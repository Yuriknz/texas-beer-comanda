"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CircleDollarSign, Undo2 } from "lucide-react";
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
import { usePoker } from "@/lib/poker-demo/store";
import { formatCurrency } from "@/lib/format";

const ATALHOS = [50, 100, 200, 500];

const TEXTOS = {
  cacife: {
    gatilho: "Cacife",
    titulo: "Lançar cacife",
    descricao: "Compra de fichas de cash game. O valor entra como débito na conta.",
    confirmar: "Lançar cacife",
    sucesso: "Cacife lançado",
  },
  devolucao: {
    gatilho: "Devolução de fichas",
    titulo: "Devolução de fichas",
    descricao: "Fichas devolvidas pelo jogador. O valor entra como crédito na conta.",
    confirmar: "Lançar devolução",
    sucesso: "Devolução lançada",
  },
};

/** Aceita "50", "50,5" e "1.250,00" (vírgula decimal, ponto de milhar). */
function lerValor(texto: string): number {
  const limpo = texto.replace(/[^\d,.]/g, "");
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const valor = Number(normalizado);
  return Number.isFinite(valor) ? Math.round(valor * 100) / 100 : 0;
}

export function ContaValorDialog({
  tipo,
  jogadorId,
}: {
  tipo: "cacife" | "devolucao";
  jogadorId: string;
}) {
  const [open, setOpen] = useState(false);
  const textos = TEXTOS[tipo];
  const Icone = tipo === "cacife" ? CircleDollarSign : Undo2;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="secondary" className="h-14 text-base" />}>
        <Icone className="size-5" /> {textos.gatilho}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{textos.titulo}</DialogTitle>
          <DialogDescription>{textos.descricao}</DialogDescription>
        </DialogHeader>
        <ValorForm tipo={tipo} jogadorId={jogadorId} onConcluir={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ValorForm({
  tipo,
  jogadorId,
  onConcluir,
}: {
  tipo: "cacife" | "devolucao";
  jogadorId: string;
  onConcluir: () => void;
}) {
  const { actions } = usePoker();
  const [texto, setTexto] = useState("");
  const textos = TEXTOS[tipo];
  const valor = lerValor(texto);

  function confirmar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const resultado =
      tipo === "cacife"
        ? actions.lancarCacife(jogadorId, valor)
        : actions.lancarDevolucao(jogadorId, valor);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(`${textos.sucesso}: ${formatCurrency(valor)}`);
    onConcluir();
  }

  return (
    <form onSubmit={confirmar} className="grid gap-4">
      <div className="grid grid-cols-4 gap-2">
        {ATALHOS.map((atalho) => (
          <Button
            key={atalho}
            type="button"
            variant={valor === atalho ? "default" : "outline"}
            className="h-14 px-1 font-money text-base"
            onClick={() => setTexto(String(atalho))}
          >
            R$ {atalho}
          </Button>
        ))}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`valor-${tipo}`}>Outro valor (R$)</Label>
        <Input
          id={`valor-${tipo}`}
          autoFocus
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          className="h-14 font-money text-2xl md:text-2xl"
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" className="h-11 px-4" onClick={onConcluir}>
          Cancelar
        </Button>
        <Button type="submit" className="h-11 px-4" disabled={!(valor > 0)}>
          {textos.confirmar}
          {valor > 0 && ` · ${formatCurrency(valor)}`}
        </Button>
      </DialogFooter>
    </form>
  );
}
