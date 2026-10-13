"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Conta, Jogador } from "@/lib/poker-demo/types";

export function CacifeJogadorPicker({
  jogadores,
  contasAbertas,
  selecionadoId,
  onSelect,
}: {
  jogadores: Jogador[];
  contasAbertas: Conta[];
  selecionadoId: string | null;
  onSelect: (jogadorId: string | null) => void;
}) {
  const [busca, setBusca] = useState("");
  const selecionado = jogadores.find((j) => j.id === selecionadoId);
  const numeroDaConta = (jogadorId: string) => contasAbertas.find((c) => c.jogadorId === jogadorId)?.numero;

  if (selecionado) {
    const numero = numeroDaConta(selecionado.id);
    return (
      <div className="flex min-h-12 items-center justify-between gap-3 rounded-lg bg-primary/10 py-1.5 pr-1.5 pl-3 ring-1 ring-primary/30">
        <div className="min-w-0">
          <div className="truncate font-medium">
            {selecionado.nome}
            {selecionado.apelido && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">{selecionado.apelido}</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {numero ? `Conta #${numero} aberta` : "Sem conta aberta — será aberta ao lançar"}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-10 px-3"
          onClick={() => {
            setBusca("");
            onSelect(null);
          }}
        >
          <X /> Trocar
        </Button>
      </div>
    );
  }

  const termo = busca.trim().toLowerCase();
  const filtrados = jogadores
    .filter((j) => !termo || `${j.nome} ${j.apelido}`.toLowerCase().includes(termo))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="cacife-jogador"
          className="h-12 pl-9"
          placeholder="Buscar por nome ou apelido"
          autoComplete="off"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
        />
      </div>
      <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg ring-1 ring-foreground/10">
        {filtrados.map((jogador) => {
          const numero = numeroDaConta(jogador.id);
          return (
            <button
              key={jogador.id}
              type="button"
              onClick={() => onSelect(jogador.id)}
              className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-muted"
            >
              <span className="min-w-0 truncate">
                {jogador.nome}
                {jogador.apelido && (
                  <span className="ml-2 text-xs text-muted-foreground">{jogador.apelido}</span>
                )}
              </span>
              {numero && <span className="shrink-0 text-xs text-primary">Conta #{numero}</span>}
            </button>
          );
        })}
        {filtrados.length === 0 && (
          <p className="px-3 py-4 text-center text-muted-foreground">
            Nenhum jogador encontrado. Cadastre em Jogadores.
          </p>
        )}
      </div>
    </div>
  );
}
