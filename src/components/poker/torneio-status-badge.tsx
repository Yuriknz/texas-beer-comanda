import { Badge } from "@/components/ui/badge";
import { TORNEIO_STATUS_LABEL } from "@/components/poker/torneio-util";
import type { Torneio } from "@/lib/poker-demo/types";
import { cn } from "@/lib/utils";

const VARIANTE: Record<Torneio["status"], "default" | "outline" | "secondary"> = {
  em_andamento: "default",
  inscricoes: "outline",
  encerrado: "secondary",
};

export function TorneioStatusBadge({
  status,
  className,
}: {
  status: Torneio["status"];
  className?: string;
}) {
  return (
    <Badge
      variant={VARIANTE[status]}
      className={cn(status === "inscricoes" && "border-primary/50 text-primary", className)}
    >
      {TORNEIO_STATUS_LABEL[status]}
    </Badge>
  );
}
