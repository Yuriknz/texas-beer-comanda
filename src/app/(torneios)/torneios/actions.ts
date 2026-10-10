"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

type CriarTorneioResult = { torneioId: string } | { error: string };

export async function criarTorneio(dados: {
  nome: string;
  buyInValor: number;
  taxaCasaPercentual: number;
}): Promise<CriarTorneioResult> {
  await requireRole(["operador_poker", "admin"]);

  if (!dados.nome.trim() || dados.buyInValor <= 0) {
    return { error: "Preencha nome e buy-in corretamente." };
  }
  if (dados.taxaCasaPercentual < 0 || dados.taxaCasaPercentual > 100) {
    return { error: "Taxa da casa deve estar entre 0 e 100%." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessoes_poker")
    .insert({
      nome: dados.nome.trim(),
      tipo: "torneio",
      buy_in_valor: dados.buyInValor,
      taxa_casa_percentual: dados.taxaCasaPercentual,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Não foi possível criar o torneio. Tente novamente." };
  }

  redirect(`/torneios/${data.id}`);
}
