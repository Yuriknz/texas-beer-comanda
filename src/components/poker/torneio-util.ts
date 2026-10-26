import { parseValor } from "@/components/poker/caixa-valor-input";
import { resumoTorneio } from "@/lib/poker-demo/calc";
import type { Torneio } from "@/lib/poker-demo/types";

export const TORNEIO_STATUS_LABEL: Record<Torneio["status"], string> = {
  inscricoes: "Inscrições abertas",
  em_andamento: "Em andamento",
  encerrado: "Encerrado",
};

/**
 * Prêmio em R$ por jogador. Segue a mesma regra do encerramento no store (o
 * primeiro inscrito encontrado em cada colocação leva o prêmio), para a tela
 * nunca prometer um valor diferente do que é creditado na conta.
 * `campeaoId` simula o 1º lugar enquanto o torneio ainda não foi encerrado.
 */
export function premiosPorJogador(torneio: Torneio, campeaoId?: string): Map<string, number> {
  const { premios } = resumoTorneio(torneio);
  const mapa = new Map<string, number>();
  premios.forEach((premio, indice) => {
    if (premio <= 0) return;
    const colocacao = indice + 1;
    const premiado = torneio.inscricoes.find((i) =>
      colocacao === 1 && campeaoId ? i.jogadorId === campeaoId : i.posicao === colocacao
    );
    if (premiado) mapa.set(premiado.jogadorId, premio);
  });
  return mapa;
}

/** Aceita vírgula decimal e ponto de milhar ("10.000" fichas), como o operador digita no teclado brasileiro. */
export function parseNumero(texto: string): number {
  return texto.trim() === "" ? Number.NaN : parseValor(texto);
}
