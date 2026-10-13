"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePinGate } from "@/components/poker/pin-gate";
import { usePoker } from "@/lib/poker-demo/store";
import type { Torneio } from "@/lib/poker-demo/types";
import { formatCurrency } from "@/lib/format";

export function TorneioInscreverDialog({ torneio }: { torneio: Torneio }) {
  const { state, actions } = usePoker();
  const pedirPin = usePinGate();
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");

  const tardia = torneio.status === "em_andamento";
  const termo = busca.trim().toLowerCase();
  const inscritos = new Set(torneio.inscricoes.map((i) => i.jogadorId));
  const disponiveis = state.jogadores
    .filter((j) => !inscritos.has(j.id))
    .sort((a, b) => a.nome.localeCompare(b.nome));
  const jogadores = disponiveis.filter(
    (j) => !termo || `${j.nome} ${j.apelido}`.toLowerCase().includes(termo)
  );

  // A lista dá lugar ao teclado de PIN (o jogador autoriza o buy-in) e volta
  // depois de cada inscrição: na abertura do torneio entram vários em sequência.
  function inscrever(jogadorId: string, nome: string) {
    setOpen(false);
    pedirPin({
      jogadorId,
      titulo: `Buy-in — ${torneio.nome}`,
      detalhe: formatCurrency(torneio.buyIn),
      executar: (credencial) => actions.inscreverJogador(torneio.id, jogadorId, credencial),
      onSucesso: () => {
        toast.success(`${nome} inscrito — buy-in de ${formatCurrency(torneio.buyIn)} lançado na conta.`);
        setBusca("");
        setOpen(true);
      },
    });
  }

  function cadastrarEInscrever() {
    const criado = actions.criarJogador({ nome: busca, apelido: "", telefone: "", cpf: "" });
    if (!criado.ok) {
      toast.error(criado.error);
      return;
    }
    inscrever(criado.id, busca.trim());
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(aberto) => {
        setOpen(aberto);
        if (!aberto) setBusca("");
      }}
    >
      <DialogTrigger render={<Button size="lg" variant={tardia ? "outline" : "default"} className="h-11 px-4" />}>
        <UserPlus /> {tardia ? "Inscrição tardia" : "Inscrever jogador"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tardia ? "Inscrição tardia" : "Inscrever jogador"}</DialogTitle>
          <DialogDescription>
            O buy-in de <span className="font-money text-foreground">{formatCurrency(torneio.buyIn)}</span> é
            lançado na conta do jogador (aberta na hora, se ele não tiver) depois que ele digitar o PIN.
          </DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          className="h-11"
          placeholder="Buscar por nome ou apelido"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
        />
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {jogadores.map((jogador) => (
            <button
              key={jogador.id}
              type="button"
              onClick={() => inscrever(jogador.id, jogador.nome)}
              className="flex min-h-12 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted"
            >
              <span>{jogador.nome}</span>
              {jogador.apelido && <span className="text-xs text-muted-foreground">{jogador.apelido}</span>}
            </button>
          ))}
          {jogadores.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-4 text-center text-muted-foreground">
              {termo ? (
                <>
                  <span>Nenhum jogador disponível com esse nome.</span>
                  <Button variant="outline" className="h-11 px-4" onClick={cadastrarEInscrever}>
                    Cadastrar “{busca.trim()}” e inscrever
                  </Button>
                </>
              ) : (
                <span>Todos os jogadores cadastrados já estão inscritos.</span>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
