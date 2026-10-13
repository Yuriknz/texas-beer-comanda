"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Converte o que o operador digitou ("50", "50,5", "1.234,56") em número.
 * Devolve NaN quando o texto não é um valor válido; vazio vira 0.
 */
export function parseValor(texto: string): number {
  const limpo = texto.trim().replace(/\s/g, "");
  if (!limpo) return 0;
  let normalizado = limpo;
  if (limpo.includes(",")) {
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    // sem vírgula, ponto seguido de 3 dígitos é separador de milhar ("1.000")
    normalizado = limpo.replace(/\./g, "");
  }
  if (!/^\d+(\.\d+)?$/.test(normalizado)) return NaN;
  return Math.round(Number(normalizado) * 100) / 100;
}

export function ValorInput({
  id,
  value,
  onChange,
  autoFocus,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder="0,00"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[^\d.,]/g, ""))}
        className="h-12 pl-10 font-money text-xl md:text-xl"
      />
    </div>
  );
}
