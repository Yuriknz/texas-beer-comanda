import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TOM = {
  padrao: "text-foreground",
  destaque: "text-primary",
  entrada: "text-emerald-400",
  saida: "text-destructive",
} as const;

export function CaixaIndicador({
  label,
  valor,
  detalhe,
  tom = "padrao",
  className,
}: {
  label: string;
  valor: string;
  detalhe?: string;
  tom?: keyof typeof TOM;
  className?: string;
}) {
  return (
    <Card className={cn("gap-1 p-4", className)}>
      <span className="text-xs tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className={cn("font-money text-xl sm:text-2xl", TOM[tom])}>{valor}</span>
      {detalhe && <span className="text-xs text-muted-foreground">{detalhe}</span>}
    </Card>
  );
}
