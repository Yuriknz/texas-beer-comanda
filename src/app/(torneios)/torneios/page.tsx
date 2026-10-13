import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/back-link";
import { NovoTorneioDialog } from "./novo-torneio-dialog";

export default async function TorneiosPage() {
  const usuario = await requireRole(["operador_poker", "admin"]);

  const supabase = await createClient();
  const { data: torneios } = await supabase
    .from("sessoes_poker")
    .select("id, nome, buy_in_valor, status, criado_em, participantes_sessao(id, status)")
    .eq("tipo", "torneio")
    .order("status")
    .order("criado_em", { ascending: false });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {usuario.role === "admin" && <BackLink href="/admin" label="Admin" />}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl">Torneios</h2>
        <NovoTorneioDialog />
      </div>

      {(torneios?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum torneio criado ainda.</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {torneios?.map((torneio) => {
          const inscritos = torneio.participantes_sessao?.length ?? 0;
          const restantes = torneio.participantes_sessao?.filter((p) => p.status === "ativo").length ?? 0;
          const aberto = torneio.status === "aberta";
          return (
            <Link key={torneio.id} href={`/torneios/${torneio.id}`}>
              <Card className="p-4">
                <CardHeader className="flex-row items-center justify-between p-0">
                  <CardTitle>{torneio.nome}</CardTitle>
                  <Badge variant={aberto ? "default" : "secondary"}>{aberto ? "Em andamento" : "Encerrado"}</Badge>
                </CardHeader>
                <CardContent className="flex items-center justify-between p-0 text-sm text-muted-foreground">
                  <span>
                    Buy-in {formatCurrency(torneio.buy_in_valor)} · {inscritos} inscritos
                    {aberto && ` · ${restantes} restantes`}
                  </span>
                  <span>{formatDateTime(torneio.criado_em)}</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
