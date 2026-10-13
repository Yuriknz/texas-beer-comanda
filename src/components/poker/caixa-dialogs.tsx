"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Lock, Minus, Plus, Store } from "lucide-react";
import {
  Dialog,
  DialogClose,
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
import { CaixaResumo } from "@/components/poker/caixa-resumo";
import { ValorInput, parseValor } from "@/components/poker/caixa-valor-input";
import { saldoCaixa, totalConta } from "@/lib/poker-demo/calc";
import { usePoker } from "@/lib/poker-demo/store";
import { formatCurrency } from "@/lib/format";

const BOTAO = "h-11 px-4 text-base";

export function CaixaAbrirDialog() {
  const { state, actions } = usePoker();
  const [open, setOpen] = useState(false);
  const [fundo, setFundo] = useState("");

  function abrir(event: React.FormEvent) {
    event.preventDefault();
    const valor = parseValor(fundo);
    // o store só barra negativo; NaN passaria e contaminaria o saldo
    if (!Number.isFinite(valor)) {
      toast.error("Fundo de troco inválido.");
      return;
    }
    const resultado = actions.abrirCaixa(valor);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setOpen(false);
    toast.success(`Caixa aberto com ${formatCurrency(valor)} de fundo de troco.`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setFundo("");
      }}
    >
      <DialogTrigger render={<Button className={BOTAO} />}>
        <Store /> Abrir caixa
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={abrir} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Abrir caixa</DialogTitle>
            <DialogDescription>
              Informe o dinheiro que já está na gaveta para troco. Operador: {state.operador}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="caixa-fundo">Fundo de troco</Label>
            <ValorInput id="caixa-fundo" value={fundo} onChange={setFundo} autoFocus />
            <p className="text-xs text-muted-foreground">Deixe em branco para abrir sem fundo.</p>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className={BOTAO} />}>
              Cancelar
            </DialogClose>
            <Button type="submit" className={BOTAO}>
              Abrir caixa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const MOVIMENTO = {
  suprimento: {
    titulo: "Suprimento",
    explicacao: "Entrada de dinheiro na gaveta (reforço de troco, por exemplo).",
    exemplo: "Ex.: reforço de troco",
    confirmar: "Registrar suprimento",
  },
  sangria: {
    titulo: "Sangria",
    explicacao: "Retirada de dinheiro da gaveta (depósito, pagamento de fornecedor…).",
    exemplo: "Ex.: retirada para o cofre",
    confirmar: "Registrar sangria",
  },
} as const;

export function CaixaMovimentoDialog({ tipo }: { tipo: keyof typeof MOVIMENTO }) {
  const { state, actions } = usePoker();
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const textos = MOVIMENTO[tipo];
  const naGaveta = saldoCaixa(state.caixa, "dinheiro");

  function registrar(event: React.FormEvent) {
    event.preventDefault();
    const numero = parseValor(valor);
    // o store não confere a gaveta; sangria maior que o dinheiro deixaria saldo negativo
    if (tipo === "sangria" && numero > naGaveta) {
      toast.error(`Só há ${formatCurrency(naGaveta)} em dinheiro na gaveta.`);
      return;
    }
    const resultado =
      tipo === "sangria"
        ? actions.registrarSangria(numero, descricao)
        : actions.registrarSuprimento(numero, descricao);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setOpen(false);
    toast.success(`${textos.titulo} de ${formatCurrency(numero)} ${tipo === "sangria" ? "registrada" : "registrado"}.`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setValor("");
          setDescricao("");
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" className={BOTAO} />}>
        {tipo === "sangria" ? <Minus /> : <Plus />} {textos.titulo}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={registrar} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{textos.titulo}</DialogTitle>
            <DialogDescription>
              {textos.explicacao} Na gaveta agora:{" "}
              <span className="font-money text-foreground">{formatCurrency(naGaveta)}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`caixa-${tipo}-valor`}>Valor</Label>
            <ValorInput id={`caixa-${tipo}-valor`} value={valor} onChange={setValor} autoFocus />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`caixa-${tipo}-descricao`}>Descrição</Label>
            <Input
              id={`caixa-${tipo}-descricao`}
              className="h-11"
              placeholder={textos.exemplo}
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className={BOTAO} />}>
              Cancelar
            </DialogClose>
            <Button type="submit" variant={tipo === "sangria" ? "destructive" : "default"} className={BOTAO}>
              {textos.confirmar}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CaixaFecharDialog() {
  const { state, actions } = usePoker();
  const [open, setOpen] = useState(false);
  const abertas = state.contas.filter((conta) => conta.status === "aberta");
  const emAberto = abertas.reduce((soma, conta) => soma + totalConta(conta), 0);

  function fechar() {
    const resultado = actions.fecharCaixa();
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setOpen(false);
    toast.success("Caixa fechado.");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" className={BOTAO} />}>
        <Lock /> Fechar caixa
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Fechar caixa</DialogTitle>
          <DialogDescription>
            Confira o dinheiro da gaveta com o valor esperado antes de confirmar.
          </DialogDescription>
        </DialogHeader>
        <CaixaResumo caixa={state.caixa} />
        {abertas.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-3 text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Há {abertas.length} conta(s) aberta(s) somando{" "}
              <span className="font-money">{formatCurrency(emAberto)}</span>. Feche todas as contas antes de
              fechar o caixa.
            </span>
          </div>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" className={BOTAO} />}>Cancelar</DialogClose>
          <Button variant="destructive" className={BOTAO} onClick={fechar}>
            Confirmar fechamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
