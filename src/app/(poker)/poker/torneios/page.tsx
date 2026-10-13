"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageTitle } from "@/components/poker/page-title";
import { TorneioNovoDialog } from "@/components/poker/torneio-novo-dialog";
import { TorneioStatusBadge } from "@/components/poker/torneio-status-badge";
import { resumoTorneio } from "@/lib/poker-demo/calc";
import { usePoker } from "@/lib/poker-demo/store";
import type { Torneio } from "@/lib/poker-demo/types";
import { formatCurrency, formatDateTime } from "@/lib/format";

const porData = (a: Torneio, b: Torneio) => a.data.localeCompare(b.data);

export default function TorneiosPage() {
  const { state } = usePoker();

  const grupos: { titulo: string; vazio: string; torneios: Torneio[] }[] = [
    {
      titulo: "Em andamento",
      vazio: "Nenhum torneio em andamento.",
      torneios: state.torneios.filter((t) => t.status === "em_andamento").sort(porData),
    },
    {
      titulo: "Inscrições abertas",
      vazio: "Nenhum torneio com inscrições abertas.",
      torneios: state.torneios.filter((t) => t.status === "inscricoes").sort(porData),
    },
    {
      titulo: "Encerrados",
      vazio: "Nenhum torneio encerrado ainda.",
      // encerrados: o mais recente primeiro
      torneios: state.torneios.filter((t) => t.status === "encerrado").sort((a, b) => porData(b, a)),
    },
  ];

  return (
    <>
      <PageTitle
        title="Torneios"
        description="Buy-in, rebuy e add-on vão direto para a conta do jogador; os prêmios entram como crédito."
      >
        <TorneioNovoDialog />
      </PageTitle>

      {state.torneios.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <Trophy className="size-10" />
          <span>Nenhum torneio cadastrado.</span>
        </div>
      )}

      {state.torneios.length > 0 &&
        grupos.map((grupo) => (
          <section key={grupo.titulo} className="flex flex-col gap-3">
            <h3 className="text-lg">
              {grupo.titulo}{" "}
              <span className="text-sm text-muted-foreground">({grupo.torneios.length})</span>
            </h3>
            {grupo.torneios.length === 0 ? (
              <p className="text-sm text-muted-foreground">{grupo.vazio}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {grupo.torneios.map((torneio) => (
                  <TorneioCard key={torneio.id} torneio={torneio} />
                ))}
              </div>
            )}
          </section>
        ))}
    </>
  );
}

function TorneioCard({ torneio }: { torneio: Torneio }) {
  const resumo = resumoTorneio(torneio);
  return (
    <Link href={`/poker/torneios/${torneio.id}`}>
      <Card className="h-full gap-3 p-4 transition-all hover:-translate-y-0.5 hover:ring-primary/40 active:translate-y-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-heading text-base tracking-wide uppercase">{torneio.nome}</div>
            <div className="text-xs text-muted-foreground">{formatDateTime(torneio.data)}</div>
          </div>
          <TorneioStatusBadge status={torneio.status} />
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Buy-in</dt>
            <dd className="font-money">{formatCurrency(torneio.buyIn)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Inscritos</dt>
            <dd className="font-money">
              {resumo.inscritos}
              {torneio.status === "em_andamento" && (
                <span className="text-xs text-muted-foreground"> · {resumo.ativos} ativos</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Arrecadado</dt>
            <dd className="font-money">{formatCurrency(resumo.arrecadado)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Prêmio líquido</dt>
            <dd className="font-money text-lg text-primary">{formatCurrency(resumo.premioLiquido)}</dd>
          </div>
        </dl>
      </Card>
    </Link>
  );
}
