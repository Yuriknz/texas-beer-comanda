"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
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
import { parseNumero } from "@/components/poker/torneio-util";
import { usePoker } from "@/lib/poker-demo/store";
import { cn } from "@/lib/utils";

const PRESETS: number[][] = [[100], [70, 30], [50, 30, 20], [40, 25, 20, 15]];
const MAX_COLOCACOES = 9;

type Form = {
  nome: string;
  data: string;
  buyIn: string;
  rebuyValor: string;
  addonValor: string;
  fichasIniciais: string;
  taxaCasaPercentual: string;
  premiacao: string[];
};

/** Valor para <input type="datetime-local"> no fuso do aparelho. */
function agoraLocal(): string {
  const data = new Date();
  data.setMinutes(data.getMinutes() - data.getTimezoneOffset());
  return data.toISOString().slice(0, 16);
}

function formInicial(): Form {
  return {
    nome: "",
    data: agoraLocal(),
    buyIn: "80",
    rebuyValor: "80",
    addonValor: "50",
    fichasIniciais: "10000",
    taxaCasaPercentual: "15",
    premiacao: ["50", "30", "20"],
  };
}

export function TorneioNovoDialog() {
  const { actions } = usePoker();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(formInicial);

  const percentuais = form.premiacao.map(parseNumero);
  const soma = percentuais.reduce((total, p) => total + (Number.isFinite(p) ? p : 0), 0);
  const somaOk = soma === 100;

  function campo<K extends keyof Form>(chave: K, valor: Form[K]) {
    setForm((atual) => ({ ...atual, [chave]: valor }));
  }

  function aoAbrir(aberto: boolean) {
    if (aberto) setForm(formInicial());
    setOpen(aberto);
  }

  function criar(event: React.FormEvent) {
    event.preventDefault();
    const data = new Date(form.data);
    const buyIn = parseNumero(form.buyIn);
    const rebuyValor = parseNumero(form.rebuyValor);
    const addonValor = parseNumero(form.addonValor);
    const fichasIniciais = parseNumero(form.fichasIniciais);
    const taxaCasaPercentual = parseNumero(form.taxaCasaPercentual);

    // O store só confere nome, buy-in e soma da premiação; o resto é validado aqui.
    if (Number.isNaN(data.getTime())) return toast.error("Informe a data e a hora do torneio.");
    if (!(rebuyValor >= 0)) return toast.error("Valor do rebuy inválido.");
    if (!(addonValor >= 0)) return toast.error("Valor do add-on inválido.");
    if (!(fichasIniciais > 0) || !Number.isInteger(fichasIniciais)) {
      return toast.error("Informe as fichas iniciais.");
    }
    if (!(taxaCasaPercentual >= 0 && taxaCasaPercentual <= 100)) {
      return toast.error("A taxa da casa deve ficar entre 0 e 100%.");
    }
    if (percentuais.some((p) => !Number.isInteger(p) || p <= 0)) {
      return toast.error("Cada colocação premiada precisa de um percentual inteiro maior que zero.");
    }

    const resultado = actions.criarTorneio({
      nome: form.nome,
      data: data.toISOString(),
      buyIn: Number.isNaN(buyIn) ? 0 : buyIn,
      rebuyValor,
      addonValor,
      fichasIniciais,
      taxaCasaPercentual,
      premiacao: percentuais,
    });
    if (!resultado.ok) return toast.error(resultado.error);

    toast.success("Torneio criado. Inscrições abertas.");
    setOpen(false);
    router.push(`/poker/torneios/${resultado.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={aoAbrir}>
      <DialogTrigger render={<Button size="lg" className="h-11 px-4" />}>
        <Plus /> Novo torneio
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <form onSubmit={criar} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Novo torneio</DialogTitle>
            <DialogDescription>
              O torneio começa com as inscrições abertas. Os valores não podem ser alterados depois.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="torneio-nome">Nome</Label>
              <Input
                id="torneio-nome"
                autoFocus
                required
                className="h-11"
                placeholder="Ex.: Torneio de Terça"
                value={form.nome}
                onChange={(event) => campo("nome", event.target.value)}
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="torneio-data">Data e hora</Label>
              <Input
                id="torneio-data"
                type="datetime-local"
                required
                className="h-11"
                value={form.data}
                onChange={(event) => campo("data", event.target.value)}
              />
            </div>
            <CampoNumero id="torneio-buyin" label="Buy-in (R$)" valor={form.buyIn} onChange={(v) => campo("buyIn", v)} />
            <CampoNumero
              id="torneio-rebuy"
              label="Rebuy (R$)"
              dica="0 = sem rebuy"
              valor={form.rebuyValor}
              onChange={(v) => campo("rebuyValor", v)}
            />
            <CampoNumero
              id="torneio-addon"
              label="Add-on (R$)"
              dica="0 = sem add-on"
              valor={form.addonValor}
              onChange={(v) => campo("addonValor", v)}
            />
            <CampoNumero
              id="torneio-fichas"
              label="Fichas iniciais"
              inteiro
              valor={form.fichasIniciais}
              onChange={(v) => campo("fichasIniciais", v)}
            />
            <CampoNumero
              id="torneio-taxa"
              label="Taxa da casa (%)"
              valor={form.taxaCasaPercentual}
              onChange={(v) => campo("taxaCasaPercentual", v)}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Premiação por colocação (%)</Label>
              <span className={cn("font-money text-sm", somaOk ? "text-emerald-400" : "text-destructive")}>
                Soma: {soma}%
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => {
                const ativo = preset.join("-") === percentuais.join("-");
                return (
                  <Button
                    key={preset.join("-")}
                    type="button"
                    variant={ativo ? "default" : "outline"}
                    className="h-11 px-3 font-money"
                    onClick={() => campo("premiacao", preset.map(String))}
                  >
                    {preset.join(" / ")}
                  </Button>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {form.premiacao.map((percentual, indice) => (
                <div key={indice} className="grid gap-1">
                  <Label htmlFor={`torneio-premio-${indice}`} className="text-xs text-muted-foreground">
                    {indice + 1}º lugar
                  </Label>
                  <Input
                    id={`torneio-premio-${indice}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    step={1}
                    className="h-11 font-money"
                    value={percentual}
                    onChange={(event) =>
                      campo(
                        "premiacao",
                        form.premiacao.map((p, i) => (i === indice ? event.target.value : p))
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 px-3"
                disabled={form.premiacao.length >= MAX_COLOCACOES}
                onClick={() => campo("premiacao", [...form.premiacao, ""])}
              >
                <Plus /> Colocação
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 px-3"
                disabled={form.premiacao.length <= 1}
                onClick={() => campo("premiacao", form.premiacao.slice(0, -1))}
              >
                <Minus /> Remover última
              </Button>
            </div>
            {!somaOk && (
              <p className="text-xs text-destructive">A premiação precisa somar exatamente 100%.</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 px-4" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="h-11 px-4">
              Criar torneio
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CampoNumero({
  id,
  label,
  dica,
  valor,
  inteiro = false,
  onChange,
}: {
  id: string;
  label: string;
  dica?: string;
  valor: string;
  inteiro?: boolean;
  onChange: (valor: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {label}
        {dica && <span className="text-xs font-normal text-muted-foreground">{dica}</span>}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode={inteiro ? "numeric" : "decimal"}
        min={0}
        step={inteiro ? 1 : "any"}
        className="h-11 font-money"
        value={valor}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
