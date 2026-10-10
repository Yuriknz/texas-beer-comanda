"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { VariantProps } from "class-variance-authority";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, type buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { alterarStatusJogador, lancarEntrada } from "./actions";

export type Jogador = {
  id: string;
  nome: string;
  buyIn: number;
  qtdRebuys: number;
  qtdAddons: number;
  totalInvestido: number;
  status: "ativo" | "eliminado" | "cashout";
  premio: number | null;
};

const STATUS_LABEL: Record<Jogador["status"], string> = {
  ativo: "Jogando",
  eliminado: "Eliminado",
  cashout: "Premiado",
};

const STATUS_VARIANT: Record<Jogador["status"], "default" | "destructive" | "secondary"> = {
  ativo: "default",
  eliminado: "destructive",
  cashout: "secondary",
};

const STATUS_ORDEM: Record<Jogador["status"], number> = { ativo: 0, cashout: 1, eliminado: 2 };

type ActionResult = { error?: string } | undefined;

function useAcao() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function executar(acao: () => Promise<ActionResult>, onSuccess?: () => void) {
    startTransition(async () => {
      const result = await acao();
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      onSuccess?.();
      router.refresh();
    });
  }

  return { isPending, executar };
}

function EntradaDialog({
  triggerLabel,
  triggerVariant,
  title,
  defaultValue,
  onConfirm,
}: {
  triggerLabel: ReactNode;
  triggerVariant?: VariantProps<typeof buttonVariants>["variant"];
  title: string;
  defaultValue: number;
  onConfirm: (valor: number) => Promise<ActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(defaultValue);
  const { isPending, executar } = useAcao();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setValor(defaultValue);
      }}
    >
      <DialogTrigger render={<Button size="sm" variant={triggerVariant} />}>{triggerLabel}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="valor-entrada">Valor</Label>
          <Input
            id="valor-entrada"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={valor}
            onChange={(event) => setValor(Number(event.target.value) || 0)}
          />
        </div>
        <DialogFooter>
          <Button disabled={isPending} onClick={() => executar(() => onConfirm(valor), () => setOpen(false))}>
            {isPending ? "Salvando…" : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusButton({
  torneioId,
  jogadorId,
  status,
  label,
  variant,
}: {
  torneioId: string;
  jogadorId: string;
  status: "ativo" | "eliminado";
  label: string;
  variant: VariantProps<typeof buttonVariants>["variant"];
}) {
  const { isPending, executar } = useAcao();
  return (
    <Button
      size="sm"
      variant={variant}
      disabled={isPending}
      onClick={() => executar(() => alterarStatusJogador(torneioId, jogadorId, status))}
    >
      {label}
    </Button>
  );
}

export function JogadoresLista({
  torneioId,
  jogadores,
  buyInPadrao,
  torneioAberto,
}: {
  torneioId: string;
  jogadores: Jogador[];
  buyInPadrao: number;
  torneioAberto: boolean;
}) {
  const [busca, setBusca] = useState("");

  if (jogadores.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum jogador inscrito ainda.</p>;
  }

  const termo = busca.trim().toLowerCase();
  const visiveis = jogadores
    .filter((jogador) => !termo || jogador.nome.toLowerCase().includes(termo))
    .sort((a, b) => STATUS_ORDEM[a.status] - STATUS_ORDEM[b.status]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-lg">Jogadores</h3>
        <Input
          className="max-w-48"
          placeholder="Buscar jogador"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Jogador</TableHead>
            <TableHead>Entradas</TableHead>
            <TableHead>Investido</TableHead>
            <TableHead>Status</TableHead>
            {torneioAberto && <TableHead>Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visiveis.map((jogador) => (
            <TableRow key={jogador.id}>
              <TableCell className="font-medium">{jogador.nome}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                1 buy-in
                {jogador.qtdRebuys > 0 && ` · ${jogador.qtdRebuys} rebuy${jogador.qtdRebuys > 1 ? "s" : ""}`}
                {jogador.qtdAddons > 0 && ` · ${jogador.qtdAddons} add-on${jogador.qtdAddons > 1 ? "s" : ""}`}
              </TableCell>
              <TableCell className="font-money">{formatCurrency(jogador.totalInvestido)}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[jogador.status]}>
                  {STATUS_LABEL[jogador.status]}
                  {jogador.status === "cashout" && jogador.premio !== null && ` · ${formatCurrency(jogador.premio)}`}
                </Badge>
              </TableCell>
              {torneioAberto && (
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {jogador.status !== "cashout" && (
                      <EntradaDialog
                        triggerLabel={jogador.status === "eliminado" ? "Reentrar" : "Rebuy"}
                        title={`${jogador.status === "eliminado" ? "Reentrada" : "Rebuy"} — ${jogador.nome}`}
                        defaultValue={buyInPadrao}
                        onConfirm={(valor) => lancarEntrada(torneioId, jogador.id, valor, "rebuy")}
                      />
                    )}
                    {jogador.status === "ativo" && (
                      <>
                        <EntradaDialog
                          triggerLabel="Add-on"
                          triggerVariant="secondary"
                          title={`Add-on — ${jogador.nome}`}
                          defaultValue={buyInPadrao}
                          onConfirm={(valor) => lancarEntrada(torneioId, jogador.id, valor, "addon")}
                        />
                        <StatusButton
                          torneioId={torneioId}
                          jogadorId={jogador.id}
                          status="eliminado"
                          label="Eliminar"
                          variant="destructive"
                        />
                      </>
                    )}
                    {jogador.status !== "ativo" && (
                      <StatusButton
                        torneioId={torneioId}
                        jogadorId={jogador.id}
                        status="ativo"
                        label="Desfazer"
                        variant="ghost"
                      />
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
