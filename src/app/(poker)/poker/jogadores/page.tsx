"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, Pencil, Plus, Search, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { JogadorFormDialog } from "@/components/poker/jogador-form-dialog";
import { PageTitle } from "@/components/poker/page-title";
import { totalConta } from "@/lib/poker-demo/calc";
import { usePoker } from "@/lib/poker-demo/store";
import type { Jogador } from "@/lib/poker-demo/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Formulario = { jogador?: Jogador; nomeInicial?: string };

export default function JogadoresPage() {
  const { state, actions } = usePoker();
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [formulario, setFormulario] = useState<Formulario | null>(null);

  const termo = busca.trim().toLowerCase();
  const jogadores = state.jogadores
    .filter((j) => !termo || `${j.nome} ${j.apelido}`.toLowerCase().includes(termo))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  function abrirConta(jogadorId: string) {
    const resultado = actions.abrirConta(jogadorId);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    router.push(`/poker/contas/${resultado.contaId}`);
  }

  return (
    <>
      <PageTitle title="Jogadores" description={`${state.jogadores.length} jogador(es) cadastrado(s)`}>
        <Button className="h-11 px-4" onClick={() => setFormulario({})}>
          <UserPlus /> Novo jogador
        </Button>
      </PageTitle>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Buscar jogador"
          placeholder="Buscar por nome ou apelido"
          className="h-11 pl-9"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
        />
      </div>

      {jogadores.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <Users className="size-10" />
          <span>Nenhum jogador encontrado.</span>
          {termo && (
            <Button
              variant="outline"
              className="h-11 px-4"
              onClick={() => setFormulario({ nomeInicial: busca.trim() })}
            >
              <Plus /> Cadastrar “{busca.trim()}”
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {jogadores.map((jogador) => {
            const contas = state.contas.filter((c) => c.jogadorId === jogador.id);
            const aberta = contas.find((c) => c.status === "aberta");
            const fechadas = contas.filter((c) => c.status === "fechada").length;
            const total = aberta ? totalConta(aberta) : 0;
            const contato = [jogador.telefone, jogador.cpf && `CPF ${jogador.cpf}`].filter(Boolean);
            return (
              <Card key={jogador.id} className="gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-base font-medium">
                      {jogador.nome}
                      {jogador.apelido && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          “{jogador.apelido}”
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {contato.length > 0 ? contato.join(" · ") : "Sem telefone ou CPF"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {fechadas === 0
                        ? "Nenhuma conta fechada"
                        : `${fechadas} conta${fechadas > 1 ? "s" : ""} fechada${fechadas > 1 ? "s" : ""}`}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-11"
                    aria-label={`Editar ${jogador.nome}`}
                    onClick={() => setFormulario({ jogador })}
                  >
                    <Pencil />
                  </Button>
                </div>

                {aberta ? (
                  <Link
                    href={`/poker/contas/${aberta.id}`}
                    className="flex min-h-12 items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2 ring-1 ring-primary/30 transition-colors hover:bg-muted"
                  >
                    <span className="text-sm">
                      Conta aberta <span className="text-muted-foreground">#{aberta.numero}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span
                        className={cn(
                          "font-money text-lg",
                          total < 0 ? "text-emerald-400" : "text-primary"
                        )}
                      >
                        {formatCurrency(total)}
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </span>
                  </Link>
                ) : (
                  <Button
                    variant="secondary"
                    className="h-12 text-base"
                    onClick={() => abrirConta(jogador.id)}
                  >
                    <Plus /> Abrir conta
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <JogadorFormDialog
        open={formulario !== null}
        onOpenChange={(open) => {
          if (!open) setFormulario(null);
        }}
        jogador={formulario?.jogador}
        nomeInicial={formulario?.nomeInicial}
      />
    </>
  );
}
