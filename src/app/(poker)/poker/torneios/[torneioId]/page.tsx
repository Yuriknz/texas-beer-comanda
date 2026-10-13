"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Info, Play, Trophy, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageTitle } from "@/components/poker/page-title";
import { usePinGate } from "@/components/poker/pin-gate";
import { TorneioEncerrarDialog } from "@/components/poker/torneio-encerrar-dialog";
import { TorneioInscreverDialog } from "@/components/poker/torneio-inscrever-dialog";
import { TorneioStatusBadge } from "@/components/poker/torneio-status-badge";
import { premiosPorJogador } from "@/components/poker/torneio-util";
import { resumoTorneio } from "@/lib/poker-demo/calc";
import { usePoker } from "@/lib/poker-demo/store";
import type { Inscricao } from "@/lib/poker-demo/types";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const numero = new Intl.NumberFormat("pt-BR");

export default function TorneioPage() {
  const { torneioId } = useParams<{ torneioId: string }>();
  const { state, actions } = usePoker();
  const pedirPin = usePinGate();
  // Eliminação pede confirmação: um toque errado no tablet muda a classificação.
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const torneio = state.torneios.find((t) => t.id === torneioId);

  if (!torneio) {
    return (
      <>
        <PageTitle title="Torneio" backHref="/poker/torneios" backLabel="Torneios" />
        <div className="flex flex-col items-center gap-4 py-16 text-center text-muted-foreground">
          <Trophy className="size-10" />
          <span>Torneio não encontrado. Ele pode ter sido removido ao restaurar os dados de demonstração.</span>
          <Link href="/poker/torneios" className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4")}>
            Voltar para os torneios
          </Link>
        </div>
      </>
    );
  }

  const resumo = resumoTorneio(torneio);
  const emInscricoes = torneio.status === "inscricoes";
  const emAndamento = torneio.status === "em_andamento";
  const encerrado = torneio.status === "encerrado";
  const temRebuy = torneio.rebuyValor > 0;
  const temAddon = torneio.addonValor > 0;

  const jogadorDe = (jogadorId: string) => state.jogadores.find((j) => j.id === jogadorId);
  const nomeDe = (jogadorId: string) => jogadorDe(jogadorId)?.nome ?? "Jogador";
  const contaAbertaDe = (jogadorId: string) =>
    state.contas.find((c) => c.jogadorId === jogadorId && c.status === "aberta");

  const premiosJogador = premiosPorJogador(torneio);
  const semPosicao = Number.MAX_SAFE_INTEGER;
  const inscricoes = [...torneio.inscricoes].sort((a, b) => {
    if (encerrado) return (a.posicao ?? semPosicao) - (b.posicao ?? semPosicao);
    if (a.status !== b.status) return a.status === "ativo" ? -1 : 1;
    if (a.status === "ativo") return nomeDe(a.jogadorId).localeCompare(nomeDe(b.jogadorId));
    return (a.posicao ?? semPosicao) - (b.posicao ?? semPosicao);
  });

  // Rebuy e add-on viram dívida do jogador: quem confirma é ele, com o PIN.
  function pedirLancamento(tipo: "rebuy" | "addon", jogadorId: string) {
    if (!torneio) return;
    const { id, nome: nomeTorneio } = torneio;
    const rebuy = tipo === "rebuy";
    const valor = formatCurrency(rebuy ? torneio.rebuyValor : torneio.addonValor);
    pedirPin({
      jogadorId,
      titulo: `${rebuy ? "Rebuy" : "Add-on"} — ${nomeTorneio}`,
      detalhe: valor,
      executar: (credencial) =>
        rebuy
          ? actions.registrarRebuy(id, jogadorId, credencial)
          : actions.registrarAddon(id, jogadorId, credencial),
      onSucesso: () =>
        toast.success(`${rebuy ? "Rebuy" : "Add-on"} de ${nomeDe(jogadorId)}: ${valor} lançado na conta.`),
    });
  }

  function pedirEliminacao(jogadorId: string) {
    setEliminando(jogadorId);
    setConfirmando(true);
  }

  function confirmarEliminacao() {
    if (!eliminando || !torneio) return;
    const resultado = actions.eliminarJogador(torneio.id, eliminando);
    setConfirmando(false);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(`${nomeDe(eliminando)} eliminado.`);
  }

  function iniciar() {
    if (!torneio) return;
    const resultado = actions.iniciarTorneio(torneio.id);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success("Torneio iniciado. Boa sorte na mesa!");
  }

  const indicadores: { label: string; valor: string; destaque?: boolean }[] = [
    { label: "Inscritos", valor: String(resumo.inscritos) },
    { label: "Ativos", valor: String(resumo.ativos) },
    { label: "Rebuys", valor: String(resumo.rebuys) },
    { label: "Add-ons", valor: String(resumo.addons) },
    { label: "Arrecadado", valor: formatCurrency(resumo.arrecadado) },
    { label: `Taxa da casa (${numero.format(torneio.taxaCasaPercentual)}%)`, valor: formatCurrency(resumo.taxaCasa) },
    { label: "Prêmio líquido", valor: formatCurrency(resumo.premioLiquido), destaque: true },
  ];

  const inscricaoEliminando = torneio.inscricoes.find((i) => i.jogadorId === eliminando);

  return (
    <>
      <PageTitle
        title={torneio.nome}
        description={formatDateTime(torneio.data)}
        backHref="/poker/torneios"
        backLabel="Torneios"
      >
        {!encerrado && <TorneioInscreverDialog torneio={torneio} />}
        {emInscricoes && (
          <Button size="lg" className="h-11 px-4" onClick={iniciar}>
            <Play /> Iniciar torneio
          </Button>
        )}
        {emAndamento && <TorneioEncerrarDialog torneio={torneio} />}
      </PageTitle>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <TorneioStatusBadge status={torneio.status} className="h-6 px-2.5 text-sm" />
        <span className="text-muted-foreground">
          Buy-in <span className="font-money text-foreground">{formatCurrency(torneio.buyIn)}</span>
        </span>
        <span className="text-muted-foreground">
          Rebuy{" "}
          <span className="font-money text-foreground">
            {temRebuy ? formatCurrency(torneio.rebuyValor) : "não tem"}
          </span>
        </span>
        <span className="text-muted-foreground">
          Add-on{" "}
          <span className="font-money text-foreground">
            {temAddon ? formatCurrency(torneio.addonValor) : "não tem"}
          </span>
        </span>
        <span className="text-muted-foreground">
          Fichas iniciais{" "}
          <span className="font-money text-foreground">{numero.format(torneio.fichasIniciais)}</span>
        </span>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-sm text-muted-foreground ring-1 ring-primary/20">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          {encerrado ? (
            <>
              Torneio encerrado. Os prêmios já foram <strong className="text-foreground">creditados na conta</strong>{" "}
              de cada colocado e são abatidos (ou pagos) no fechamento da conta.
            </>
          ) : (
            <>
              Buy-in, rebuy e add-on são <strong className="text-foreground">lançados automaticamente na conta</strong>{" "}
              do jogador — nada é cobrado aqui. No encerramento, os prêmios entram como{" "}
              <strong className="text-foreground">crédito na conta</strong> dos colocados.
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {indicadores.map((indicador) => (
          <Card
            key={indicador.label}
            className={cn("gap-1 p-3", indicador.destaque && "col-span-2 ring-primary/40")}
          >
            <span className="text-xs text-muted-foreground">{indicador.label}</span>
            <span className={cn("font-money text-xl", indicador.destaque && "text-2xl text-primary")}>
              {indicador.valor}
            </span>
          </Card>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="flex flex-col gap-3">
          <div>
            <h3 className="text-lg">Premiação</h3>
            <p className="text-sm text-muted-foreground">
              {encerrado
                ? "Valores finais pagos por colocação."
                : "Atualizada a cada inscrição, rebuy e add-on."}
            </p>
          </div>
          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3">Colocação</TableHead>
                  <TableHead className="px-3 text-right">%</TableHead>
                  <TableHead className="px-3 text-right">Prêmio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumo.premios.map((premio, indice) => {
                  const colocado = torneio.inscricoes.find(
                    (i) => i.posicao === indice + 1 && premiosJogador.has(i.jogadorId)
                  );
                  return (
                    <TableRow key={indice}>
                      <TableCell className="px-3 py-3 whitespace-normal">
                        <span className="font-heading text-primary">{indice + 1}º lugar</span>
                        {colocado && (
                          <div className="text-xs text-muted-foreground">{nomeDe(colocado.jogadorId)}</div>
                        )}
                      </TableCell>
                      <TableCell className="px-3 text-right font-money text-muted-foreground">
                        {numero.format(torneio.premiacao[indice])}%
                      </TableCell>
                      <TableCell className="px-3 text-right font-money text-base">
                        {formatCurrency(premio)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="px-3" colSpan={2}>
                    Prêmio líquido
                  </TableCell>
                  <TableCell className="px-3 text-right font-money text-base text-primary">
                    {formatCurrency(resumo.premioLiquido)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <div>
            <h3 className="text-lg">{encerrado ? "Classificação final" : "Inscritos"}</h3>
            <p className="text-sm text-muted-foreground">
              {emInscricoes &&
                (resumo.inscritos < 2
                  ? "Inscreva pelo menos 2 jogadores para iniciar o torneio."
                  : `${resumo.inscritos} inscritos — pronto para iniciar.`)}
              {emAndamento &&
                (resumo.ativos === 1
                  ? "Restou o campeão — encerre o torneio para creditar os prêmios."
                  : `${resumo.ativos} jogadores na disputa. Elimine até restar o campeão para encerrar.`)}
              {encerrado && `${resumo.inscritos} participantes.`}
            </p>
          </div>

          {inscricoes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <UserX className="size-10" />
              <span>Nenhum jogador inscrito ainda.</span>
            </div>
          ) : (
            <Card className="gap-0 p-0">
              <ul className="flex flex-col divide-y divide-border">
                {inscricoes.map((inscricao) => {
                  const jogador = jogadorDe(inscricao.jogadorId);
                  const conta = contaAbertaDe(inscricao.jogadorId);
                  const eliminado = inscricao.status === "eliminado";
                  const premio = premiosJogador.get(inscricao.jogadorId);
                  return (
                    <li
                      key={inscricao.jogadorId}
                      className={cn(
                        "flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between",
                        eliminado && !encerrado && "bg-muted/30"
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Colocacao inscricao={inscricao} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            {conta ? (
                              <Link
                                href={`/poker/contas/${conta.id}`}
                                className="truncate font-medium underline decoration-primary/50 underline-offset-4 hover:text-primary"
                              >
                                {jogador?.nome ?? "Jogador"}
                              </Link>
                            ) : (
                              <span className="truncate font-medium">{jogador?.nome ?? "Jogador"}</span>
                            )}
                            {jogador?.apelido && (
                              <span className="text-xs text-muted-foreground">{jogador.apelido}</span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            {!encerrado && (
                              <Badge variant={eliminado ? "destructive" : "outline"}>
                                {eliminado ? "Eliminado" : "Ativo"}
                              </Badge>
                            )}
                            <Badge variant="secondary">
                              {inscricao.rebuys} {inscricao.rebuys === 1 ? "rebuy" : "rebuys"}
                            </Badge>
                            {inscricao.addon && <Badge variant="secondary">Add-on</Badge>}
                            {conta ? <span>Conta #{conta.numero}</span> : <span>Sem conta aberta</span>}
                          </div>
                        </div>
                      </div>

                      {premio !== undefined && (
                        <div className="shrink-0 sm:text-right">
                          <div className="text-xs text-muted-foreground">
                            {encerrado ? "Prêmio creditado" : "Prêmio previsto"}
                          </div>
                          <div className="font-money text-lg text-emerald-400">{formatCurrency(premio)}</div>
                        </div>
                      )}

                      {emAndamento && (
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {temRebuy && (
                            <Button
                              variant="outline"
                              className="h-11 flex-1 px-3 sm:flex-none"
                              disabled={inscricao.addon}
                              title={inscricao.addon ? "Depois do add-on não há mais rebuy" : undefined}
                              onClick={() => pedirLancamento("rebuy", inscricao.jogadorId)}
                            >
                              Rebuy
                            </Button>
                          )}
                          {temAddon && !eliminado && (
                            <Button
                              variant="outline"
                              className="h-11 flex-1 px-3 sm:flex-none"
                              disabled={inscricao.addon}
                              onClick={() => pedirLancamento("addon", inscricao.jogadorId)}
                            >
                              Add-on
                            </Button>
                          )}
                          {!eliminado && (
                            <Button
                              variant="destructive"
                              className="h-11 flex-1 px-3 sm:flex-none"
                              disabled={resumo.ativos <= 1}
                              onClick={() => pedirEliminacao(inscricao.jogadorId)}
                            >
                              Eliminar
                            </Button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </section>
      </div>

      <Dialog open={confirmando} onOpenChange={setConfirmando}>
        <DialogContent>
          {eliminando && (
            <>
              <DialogHeader>
                <DialogTitle>Eliminar jogador</DialogTitle>
                <DialogDescription>
                  Eliminar <Nome>{nomeDe(eliminando)}</Nome> em <Valor>{resumo.ativos}º lugar</Valor>?
                  {temRebuy && !inscricaoEliminando?.addon && " Ele ainda pode voltar com um rebuy."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" className="h-11 px-4" onClick={() => setConfirmando(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" className="h-11 px-4" onClick={confirmarEliminacao}>
                  Eliminar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Colocacao({ inscricao }: { inscricao: Inscricao }) {
  const campeao = inscricao.posicao === 1;
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full font-heading text-sm",
        campeao
          ? "bg-primary text-primary-foreground"
          : inscricao.posicao
            ? "bg-muted text-muted-foreground"
            : "bg-primary/10 text-primary ring-1 ring-primary/30"
      )}
    >
      {campeao ? <Trophy className="size-5" /> : inscricao.posicao ? `${inscricao.posicao}º` : "—"}
    </span>
  );
}

function Nome({ children }: { children: React.ReactNode }) {
  return <strong className="text-foreground">{children}</strong>;
}

function Valor({ children }: { children: React.ReactNode }) {
  return <span className="font-money text-foreground">{children}</span>;
}
