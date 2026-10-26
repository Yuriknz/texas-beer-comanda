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
import { resumoTorneio } from "@/lib/poker-demo/calc";
import { usePoker } from "@/lib/poker-demo/store";
import type { Torneio } from "@/lib/poker-demo/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Sem eliminação na mesa por enquanto: no encerramento o operador toca nos
 * jogadores na ordem da classificação (campeão primeiro) até preencher as
 * colocações premiadas.
 */
export function TorneioEncerrarDialog({ torneio }: { torneio: Torneio }) {
  const { state, actions } = usePoker();
  const [open, setOpen] = useState(false);
  const [colocados, setColocados] = useState<string[]>([]);

  const nome = (jogadorId: string) =>
    state.jogadores.find((j) => j.id === jogadorId)?.nome ?? "Jogador";

  const resumo = resumoTorneio(torneio);
  const premiados = resumo.premios.length;
  const faltamJogadores = torneio.inscricoes.length < premiados;
  const completo = colocados.length === premiados;
  const inscritos = [...torneio.inscricoes].sort((a, b) => nome(a.jogadorId).localeCompare(nome(b.jogadorId)));

  function abrir(aberto: boolean) {
    // cada abertura começa do zero, para não confirmar uma escolha esquecida
    if (aberto) setColocados([]);
    setOpen(aberto);
  }

  function tocar(jogadorId: string) {
    setColocados((atual) => {
      if (atual.includes(jogadorId)) return atual.filter((id) => id !== jogadorId);
      if (atual.length >= premiados) return atual;
      return [...atual, jogadorId];
    });
  }

  function encerrar() {
    const resultado = actions.encerrarTorneio(torneio.id, colocados);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success("Torneio encerrado. Prêmios creditados nas contas.");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={abrir}>
      <DialogTrigger render={<Button size="lg" className="h-11 px-4" />}>
        <Flag /> Encerrar torneio
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Encerrar torneio</DialogTitle>
          <DialogDescription>
            Toque nos jogadores na ordem da classificação, começando pelo campeão. Ao confirmar, os
            prêmios entram como crédito na conta e o torneio não pode mais ser alterado.
          </DialogDescription>
        </DialogHeader>

        {faltamJogadores ? (
          <p className="text-sm text-destructive">
            Há {premiados} colocações premiadas e só {torneio.inscricoes.length} inscritos. Diminua os
            premiados na tela do torneio antes de encerrar.
          </p>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-border">
              {resumo.premios.map((premio, indice) => {
                const jogadorId = colocados[indice];
                return (
                  <li key={indice} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      {indice === 0 ? (
                        <Trophy className="size-4 shrink-0 text-primary" />
                      ) : (
                        <span className="font-heading text-primary">{indice + 1}º</span>
                      )}
                      {jogadorId ? (
                        <span className="truncate">{nome(jogadorId)}</span>
                      ) : (
                        <span className="text-muted-foreground">Toque no jogador abaixo</span>
                      )}
                    </div>
                    <span className={cn("font-money", jogadorId ? "text-emerald-400" : "text-muted-foreground")}>
                      {formatCurrency(premio)}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="grid grid-cols-2 gap-2">
              {inscritos.map((inscricao) => {
                const posicao = colocados.indexOf(inscricao.jogadorId);
                const escolhido = posicao >= 0;
                return (
                  <Button
                    key={inscricao.jogadorId}
                    type="button"
                    variant={escolhido ? "default" : "outline"}
                    className="h-12 justify-start gap-2 px-3"
                    disabled={!escolhido && completo}
                    onClick={() => tocar(inscricao.jogadorId)}
                  >
                    <span className="w-6 shrink-0 font-heading">{escolhido ? `${posicao + 1}º` : "—"}</span>
                    <span className="truncate">{nome(inscricao.jogadorId)}</span>
                  </Button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {completo
                  ? "Total creditado nas contas"
                  : `Falta${premiados - colocados.length === 1 ? "" : "m"} ${premiados - colocados.length} ${premiados - colocados.length === 1 ? "colocação" : "colocações"}`}
              </span>
              <span className="font-money text-base">{formatCurrency(resumo.premioLiquido)}</span>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" className="h-11 px-4" onClick={() => setOpen(false)}>
            Voltar
          </Button>
          <Button className="h-11 px-4" onClick={encerrar} disabled={faltamJogadores || !completo}>
            Confirmar e creditar prêmios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
