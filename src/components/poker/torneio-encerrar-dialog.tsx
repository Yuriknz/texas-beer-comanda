"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Flag, Trophy } from "lucide-react";
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
import { premiosPorJogador } from "@/components/poker/torneio-util";
import { resumoTorneio } from "@/lib/poker-demo/calc";
import { usePoker } from "@/lib/poker-demo/store";
import type { Torneio } from "@/lib/poker-demo/types";
import { formatCurrency } from "@/lib/format";

export function TorneioEncerrarDialog({ torneio }: { torneio: Torneio }) {
  const { state, actions } = usePoker();
  const [open, setOpen] = useState(false);

  const ativos = torneio.inscricoes.filter((i) => i.status === "ativo");
  const campeao = ativos.length === 1 ? ativos[0] : undefined;
  const nome = (jogadorId: string) =>
    state.jogadores.find((j) => j.id === jogadorId)?.nome ?? "Jogador";

  const resumo = resumoTorneio(torneio);
  const premiosJogador = premiosPorJogador(torneio, campeao?.jogadorId);
  const linhas = resumo.premios.map((premio, indice) => {
    const colocacao = indice + 1;
    const premiado = torneio.inscricoes.find((i) =>
      colocacao === 1 ? i.jogadorId === campeao?.jogadorId : i.posicao === colocacao
    );
    return { colocacao, premio, jogadorId: premiado?.jogadorId };
  });
  const semDono = linhas
    .filter((l) => !l.jogadorId && l.premio > 0)
    .reduce((soma, l) => soma + l.premio, 0);
  const totalCreditado = [...premiosJogador.values()].reduce((soma, premio) => soma + premio, 0);

  function encerrar() {
    const resultado = actions.encerrarTorneio(torneio.id);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success("Torneio encerrado. Prêmios creditados nas contas.");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" className="h-11 px-4" disabled={!campeao} />}>
        <Flag /> Encerrar torneio
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Encerrar torneio</DialogTitle>
          <DialogDescription>
            Confira o resultado. Ao confirmar, os prêmios entram como crédito na conta de cada
            jogador e o torneio não pode mais ser alterado.
          </DialogDescription>
        </DialogHeader>

        {campeao && (
          <div className="flex items-center gap-3 rounded-lg bg-primary/10 p-3 ring-1 ring-primary/30">
            <Trophy className="size-8 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground uppercase">Campeão</div>
              <div className="truncate font-heading text-lg uppercase">{nome(campeao.jogadorId)}</div>
            </div>
          </div>
        )}

        <ul className="flex flex-col divide-y divide-border">
          {linhas.map((linha) => (
            <li key={linha.colocacao} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <span className="mr-2 font-heading text-primary">{linha.colocacao}º</span>
                {linha.jogadorId ? (
                  <span>{nome(linha.jogadorId)}</span>
                ) : (
                  <span className="text-muted-foreground">Sem jogador nesta colocação</span>
                )}
              </div>
              <span
                className={
                  linha.jogadorId ? "font-money text-emerald-400" : "font-money text-muted-foreground line-through"
                }
              >
                {formatCurrency(linha.premio)}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Total creditado nas contas</span>
          <span className="font-money text-base">{formatCurrency(totalCreditado)}</span>
        </div>
        {semDono > 0 && (
          <p className="text-xs text-destructive">
            {formatCurrency(semDono)} da premiação não tem colocado correspondente. Diminua o número de
            premiados na tela do torneio antes de encerrar.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" className="h-11 px-4" onClick={() => setOpen(false)}>
            Voltar
          </Button>
          <Button className="h-11 px-4" onClick={encerrar} disabled={!campeao || semDono > 0}>
            Confirmar e creditar prêmios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
