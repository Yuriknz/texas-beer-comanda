import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FORMA_LABEL, sinalMovimento } from "@/lib/poker-demo/calc";
import type { MovimentoCaixa, MovimentoTipo } from "@/lib/poker-demo/types";
import { formatCurrency, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const TIPO: Record<MovimentoTipo, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  abertura: { label: "Abertura", variant: "outline" },
  suprimento: { label: "Suprimento", variant: "secondary" },
  sangria: { label: "Sangria", variant: "destructive" },
  recebimento: { label: "Recebimento", variant: "default" },
  pagamento: { label: "Pagamento", variant: "destructive" },
};

/** Movimentos do caixa, do mais recente para o mais antigo. */
export function CaixaMovimentos({ movimentos }: { movimentos: MovimentoCaixa[] }) {
  const ordenados = [...movimentos].sort((a, b) => b.em.localeCompare(a.em));

  if (ordenados.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">Nenhum movimento registrado.</p>;
  }

  return (
    <Card className="gap-0 py-0">
      {ordenados.map((movimento) => {
        const sinal = sinalMovimento(movimento);
        const tipo = TIPO[movimento.tipo];
        return (
          <div
            key={movimento.id}
            className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
          >
            <span className="w-12 shrink-0 text-sm text-muted-foreground tabular-nums">
              {formatTime(movimento.em)}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={tipo.variant}>{tipo.label}</Badge>
                <span className="text-xs text-muted-foreground">{FORMA_LABEL[movimento.forma]}</span>
              </div>
              {movimento.contaId ? (
                <Link
                  href={`/poker/contas/${movimento.contaId}`}
                  className="truncate py-1 underline decoration-primary/50 underline-offset-4 hover:text-primary"
                >
                  {movimento.descricao}
                </Link>
              ) : (
                <span className="truncate">{movimento.descricao}</span>
              )}
            </div>
            <span
              className={cn(
                "shrink-0 font-money text-base whitespace-nowrap",
                sinal < 0 ? "text-destructive" : "text-emerald-400"
              )}
            >
              {sinal < 0 ? "−" : "+"} {formatCurrency(movimento.valor)}
            </span>
          </div>
        );
      })}
    </Card>
  );
}
