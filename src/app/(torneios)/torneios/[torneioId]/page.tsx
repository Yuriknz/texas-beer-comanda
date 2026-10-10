import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { calcularRake, sugerirPremiados } from "@/lib/torneio";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/back-link";
import { JogadoresLista, type Jogador } from "./jogadores-lista";
import { InscreverJogadorForm } from "./inscrever-jogador-form";
import { PremiacaoCard } from "./premiacao-card";
import { EncerrarTorneioDialog } from "./encerrar-torneio-dialog";

function Stat({ label, value, destaque }: { label: string; value: string | number; destaque?: boolean }) {
  return (
    <div className="rounded-lg border border-border/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-money text-lg ${destaque ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

export default async function TorneioPage({ params }: { params: Promise<{ torneioId: string }> }) {
  await requireRole(["operador_poker", "admin"]);
  const { torneioId } = await params;

  const supabase = await createClient();

  const { data: torneio } = await supabase
    .from("sessoes_poker")
    .select("*")
    .eq("id", torneioId)
    .eq("tipo", "torneio")
    .single();

  if (!torneio) {
    notFound();
  }

  const { data: participantes } = await supabase
    .from("participantes_sessao")
    .select("id, nome_jogador, buy_in_inicial, status, valor_cashout, rebuys(valor, tipo)")
    .eq("sessao_id", torneioId)
    .order("criado_em");

  const jogadores: Jogador[] = (participantes ?? []).map((participante) => {
    const rebuys = participante.rebuys ?? [];
    const totalEntradas = rebuys.reduce((sum, rebuy) => sum + Number(rebuy.valor), 0);
    return {
      id: participante.id,
      nome: participante.nome_jogador,
      buyIn: Number(participante.buy_in_inicial),
      qtdRebuys: rebuys.filter((rebuy) => rebuy.tipo === "rebuy").length,
      qtdAddons: rebuys.filter((rebuy) => rebuy.tipo === "addon").length,
      totalInvestido: Number(participante.buy_in_inicial) + totalEntradas,
      status: participante.status,
      premio: participante.valor_cashout !== null ? Number(participante.valor_cashout) : null,
    };
  });

  const aberto = torneio.status === "aberta";
  const buyInPadrao = Number(torneio.buy_in_valor);
  const taxa = Number(torneio.taxa_casa_percentual);
  const totalArrecadado = jogadores.reduce((sum, jogador) => sum + jogador.totalInvestido, 0);
  const rake = aberto ? calcularRake(totalArrecadado, taxa) : Number(torneio.rake_total ?? 0);
  const prizePool = Math.max(totalArrecadado - rake, 0);
  const restantes = jogadores.filter((jogador) => jogador.status === "ativo").length;
  const qtdRebuys = jogadores.reduce((sum, jogador) => sum + jogador.qtdRebuys, 0);
  const qtdAddons = jogadores.reduce((sum, jogador) => sum + jogador.qtdAddons, 0);
  const totalPago = jogadores.reduce((sum, jogador) => sum + (jogador.status === "cashout" ? jogador.premio ?? 0 : 0), 0);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <BackLink href="/torneios" label="Torneios" />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{torneio.nome}</CardTitle>
          <Badge variant={aberto ? "default" : "secondary"}>{aberto ? "Em andamento" : "Encerrado"}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Buy-in {formatCurrency(buyInPadrao)} · taxa da casa {taxa}% · início {formatDateTime(torneio.data_inicio)}
            {torneio.data_fim && ` · fim ${formatDateTime(torneio.data_fim)}`}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Inscritos" value={jogadores.length} />
            <Stat label="Restantes" value={restantes} />
            <Stat label="Rebuys" value={qtdRebuys} />
            <Stat label="Add-ons" value={qtdAddons} />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Stat label="Arrecadado" value={formatCurrency(totalArrecadado)} />
            <Stat label={aberto ? `Taxa da casa (${taxa}%)` : "Taxa da casa"} value={formatCurrency(rake)} />
            <Stat label="Prize pool" value={formatCurrency(prizePool)} destaque />
          </div>
        </CardContent>
      </Card>

      {aberto && <InscreverJogadorForm torneioId={torneioId} buyInPadrao={buyInPadrao} />}

      {jogadores.length > 0 && (
        <PremiacaoCard
          torneioId={torneioId}
          prizePool={prizePool}
          premiadosSugerido={sugerirPremiados(jogadores.length)}
          jogadores={jogadores}
          torneioAberto={aberto}
        />
      )}

      <JogadoresLista
        torneioId={torneioId}
        jogadores={jogadores}
        buyInPadrao={buyInPadrao}
        torneioAberto={aberto}
      />

      {aberto && jogadores.length > 0 && restantes === 0 && (
        <EncerrarTorneioDialog
          torneioId={torneioId}
          totalArrecadado={totalArrecadado}
          rakeSugerido={rake}
          totalPago={totalPago}
        />
      )}
      {aberto && restantes > 0 && jogadores.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Pra encerrar, todos os jogadores precisam estar eliminados ou premiados.
        </p>
      )}
    </div>
  );
}
