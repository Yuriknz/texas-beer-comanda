"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { ESTRUTURAS_PREMIACAO, MAX_PREMIADOS, calcularPremios } from "@/lib/torneio";
import { premiarJogador } from "./actions";
import type { Jogador } from "./jogadores-lista";

const SELECT_CLASS =
  "h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function PagarLinha({
  torneioId,
  valor,
  candidatos,
}: {
  torneioId: string;
  valor: number;
  candidatos: Jogador[];
}) {
  const [jogadorId, setJogadorId] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handlePagar() {
    const jogador = candidatos.find((candidato) => candidato.id === jogadorId);
    if (!jogador) return;
    startTransition(async () => {
      const result = await premiarJogador(torneioId, jogador.id, valor);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${jogador.nome} premiado com ${formatCurrency(valor)}`);
      setJogadorId("");
      router.refresh();
    });
  }

  return (
    <div className="flex gap-1.5">
      <select
        aria-label="Jogador premiado"
        className={SELECT_CLASS}
        value={jogadorId}
        onChange={(event) => setJogadorId(event.target.value)}
      >
        <option value="">Escolher jogador…</option>
        {candidatos.map((candidato) => (
          <option key={candidato.id} value={candidato.id}>
            {candidato.nome}
            {candidato.status === "eliminado" ? " (eliminado)" : ""}
          </option>
        ))}
      </select>
      <Button size="sm" disabled={isPending || !jogadorId} onClick={handlePagar}>
        Pagar
      </Button>
    </div>
  );
}

export function PremiacaoCard({
  torneioId,
  prizePool,
  premiadosSugerido,
  jogadores,
  torneioAberto,
}: {
  torneioId: string;
  prizePool: number;
  premiadosSugerido: number;
  jogadores: Jogador[];
  torneioAberto: boolean;
}) {
  const jaPremiados = jogadores.filter((jogador) => jogador.status === "cashout");
  // Segue a sugestão (que cresce com os inscritos) até o operador escolher manualmente.
  const [premiadosEscolhido, setPremiados] = useState<number | null>(null);
  const premiados = Math.min(Math.max(premiadosEscolhido ?? premiadosSugerido, jaPremiados.length, 1), MAX_PREMIADOS);
  const percentuais = ESTRUTURAS_PREMIACAO[premiados];
  const premios = calcularPremios(prizePool, premiados);
  const candidatos = jogadores.filter((jogador) => jogador.status !== "cashout");
  const totalPago = jaPremiados.reduce((sum, jogador) => sum + (jogador.premio ?? 0), 0);

  // Não guardamos a colocação no banco: cada premiado é casado com a posição
  // cujo prêmio bate com o valor pago. Quem não casar (prêmio editado, pool
  // mudou depois) aparece em "outros pagamentos".
  const pagoPorPosicao = new Map<number, Jogador>();
  const outrosPagos: Jogador[] = [];
  for (const jogador of [...jaPremiados].sort((a, b) => (b.premio ?? 0) - (a.premio ?? 0))) {
    const posicao = premios.findIndex(
      (valor, index) => !pagoPorPosicao.has(index) && Math.abs(valor - (jogador.premio ?? 0)) < 0.01
    );
    if (posicao >= 0) pagoPorPosicao.set(posicao, jogador);
    else outrosPagos.push(jogador);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>Premiação</CardTitle>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Premiados
          <select
            className={SELECT_CLASS}
            value={premiados}
            onChange={(event) => setPremiados(Number(event.target.value))}
          >
            {Array.from({ length: MAX_PREMIADOS }, (_, index) => index + 1).map((n) => (
              <option key={n} value={n} disabled={n < jaPremiados.length}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Posição</TableHead>
              <TableHead>%</TableHead>
              <TableHead>Prêmio</TableHead>
              <TableHead>Pago a</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {premios.map((valor, index) => {
              const pago = pagoPorPosicao.get(index);
              return (
                <TableRow key={index}>
                  <TableCell className="font-medium">{index + 1}º</TableCell>
                  <TableCell className="text-muted-foreground">{percentuais[index]}%</TableCell>
                  <TableCell className="font-money">{formatCurrency(valor)}</TableCell>
                  <TableCell>
                    {pago ? (
                      <span className="text-sm">
                        {pago.nome} · <span className="font-money">{formatCurrency(pago.premio ?? 0)}</span>
                      </span>
                    ) : torneioAberto && candidatos.length > 0 ? (
                      <PagarLinha torneioId={torneioId} valor={valor} candidatos={candidatos} />
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {outrosPagos.length > 0 && (
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Outros pagamentos</p>
            {outrosPagos.map((jogador) => (
              <div key={jogador.id} className="flex items-baseline justify-between">
                <span>{jogador.nome}</span>
                <span className="font-money">{formatCurrency(jogador.premio ?? 0)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-baseline justify-between text-sm text-muted-foreground">
          <span>Já pago</span>
          <span className="font-money">
            {formatCurrency(totalPago)} de {formatCurrency(prizePool)}
          </span>
        </div>
        {torneioAberto && (
          <p className="text-xs text-muted-foreground">
            Pague de baixo pra cima conforme os jogadores caem na zona de premiação. Valores recalculam ao vivo
            com novos buy-ins, rebuys e add-ons.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
