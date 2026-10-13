"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { usePoker } from "@/lib/poker-demo/store";

export function NovaContaDialog() {
  const { state, actions } = usePoker();
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const router = useRouter();

  const termo = busca.trim().toLowerCase();
  const jogadores = state.jogadores
    .filter((j) => !termo || `${j.nome} ${j.apelido}`.toLowerCase().includes(termo))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  function abrir(jogadorId: string) {
    const resultado = actions.abrirConta(jogadorId);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setOpen(false);
    router.push(`/poker/contas/${resultado.contaId}`);
  }

  function cadastrarEAbrir() {
    const criado = actions.criarJogador({ nome: busca, apelido: "", telefone: "", cpf: "" });
    if (!criado.ok) {
      toast.error(criado.error);
      return;
    }
    abrir(criado.id);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" />}>
        <Plus /> Nova conta
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir conta</DialogTitle>
          <DialogDescription>Escolha o jogador. Se ele já tiver conta aberta, ela é reaberta.</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Buscar por nome ou apelido"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
        />
        <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {jogadores.map((jogador) => (
            <button
              key={jogador.id}
              type="button"
              onClick={() => abrir(jogador.id)}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted"
            >
              <span>{jogador.nome}</span>
              {jogador.apelido && <span className="text-xs text-muted-foreground">{jogador.apelido}</span>}
            </button>
          ))}
          {jogadores.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-4 text-center text-muted-foreground">
              <span>Nenhum jogador encontrado.</span>
              <Button variant="outline" onClick={cadastrarEAbrir}>
                Cadastrar “{busca.trim()}” e abrir conta
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
