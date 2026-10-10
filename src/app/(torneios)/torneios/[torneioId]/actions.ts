"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

type ActionResult = { error?: string } | undefined;

/** Garante operador logado e torneio ainda em andamento antes de qualquer escrita. */
async function prepararEscrita(torneioId: string) {
  const usuario = await requireRole(["operador_poker", "admin"]);
  const supabase = await createClient();

  const { data: torneio } = await supabase
    .from("sessoes_poker")
    .select("status")
    .eq("id", torneioId)
    .eq("tipo", "torneio")
    .single();

  if (!torneio) return { error: "Torneio não encontrado." } as const;
  if (torneio.status !== "aberta") return { error: "Este torneio já foi encerrado." } as const;

  return { usuario, supabase } as const;
}

export async function inscreverJogador(torneioId: string, nomeJogador: string, buyIn: number): Promise<ActionResult> {
  const ctx = await prepararEscrita(torneioId);
  if ("error" in ctx) return ctx;

  if (!nomeJogador.trim() || buyIn <= 0) {
    return { error: "Preencha nome e buy-in corretamente." };
  }

  const { error } = await ctx.supabase.from("participantes_sessao").insert({
    sessao_id: torneioId,
    nome_jogador: nomeJogador.trim(),
    buy_in_inicial: buyIn,
  });

  if (error) return { error: "Não foi possível inscrever o jogador." };

  revalidatePath(`/torneios/${torneioId}`);
}

/**
 * Rebuy ou add-on. Rebuy em jogador eliminado é uma reentrada: além de lançar
 * o valor, volta o jogador pra ativo.
 */
export async function lancarEntrada(
  torneioId: string,
  participanteId: string,
  valor: number,
  tipo: "rebuy" | "addon"
): Promise<ActionResult> {
  const ctx = await prepararEscrita(torneioId);
  if ("error" in ctx) return ctx;

  if (valor <= 0) return { error: "Valor inválido." };

  const { data: participante } = await ctx.supabase
    .from("participantes_sessao")
    .select("status")
    .eq("id", participanteId)
    .eq("sessao_id", torneioId)
    .single();

  if (!participante) return { error: "Jogador não encontrado." };
  if (participante.status === "cashout") return { error: "Jogador já foi premiado." };
  if (participante.status === "eliminado" && tipo === "addon") {
    return { error: "Jogador eliminado não pode fazer add-on. Use rebuy pra reentrar." };
  }

  const { error } = await ctx.supabase.from("rebuys").insert({
    participante_sessao_id: participanteId,
    valor,
    tipo,
    registrado_por: ctx.usuario.id,
  });

  if (error) return { error: `Não foi possível lançar o ${tipo === "addon" ? "add-on" : "rebuy"}.` };

  if (participante.status === "eliminado") {
    await ctx.supabase.from("participantes_sessao").update({ status: "ativo" }).eq("id", participanteId);
  }

  revalidatePath(`/torneios/${torneioId}`);
}

export async function alterarStatusJogador(
  torneioId: string,
  participanteId: string,
  status: "ativo" | "eliminado"
): Promise<ActionResult> {
  const ctx = await prepararEscrita(torneioId);
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase
    .from("participantes_sessao")
    .update({ status, valor_cashout: null })
    .eq("id", participanteId)
    .eq("sessao_id", torneioId);

  if (error) return { error: "Não foi possível atualizar o jogador." };

  revalidatePath(`/torneios/${torneioId}`);
}

export async function premiarJogador(torneioId: string, participanteId: string, valor: number): Promise<ActionResult> {
  const ctx = await prepararEscrita(torneioId);
  if ("error" in ctx) return ctx;

  if (valor < 0) return { error: "Valor inválido." };

  const { error } = await ctx.supabase
    .from("participantes_sessao")
    .update({ status: "cashout", valor_cashout: valor })
    .eq("id", participanteId)
    .eq("sessao_id", torneioId);

  if (error) return { error: "Não foi possível registrar o prêmio." };

  revalidatePath(`/torneios/${torneioId}`);
}

export async function encerrarTorneio(torneioId: string, rakeTotal: number): Promise<ActionResult> {
  const ctx = await prepararEscrita(torneioId);
  if ("error" in ctx) return ctx;

  if (rakeTotal < 0) return { error: "Valor de taxa inválido." };

  const { count } = await ctx.supabase
    .from("participantes_sessao")
    .select("id", { count: "exact", head: true })
    .eq("sessao_id", torneioId)
    .eq("status", "ativo");

  if (count && count > 0) {
    return { error: "Ainda há jogadores ativos. Elimine ou premie todos antes de encerrar." };
  }

  const { error } = await ctx.supabase
    .from("sessoes_poker")
    .update({ status: "encerrada", data_fim: new Date().toISOString(), rake_total: rakeTotal })
    .eq("id", torneioId);

  if (error) return { error: "Não foi possível encerrar o torneio." };

  revalidatePath("/torneios");
  revalidatePath(`/torneios/${torneioId}`);
}
