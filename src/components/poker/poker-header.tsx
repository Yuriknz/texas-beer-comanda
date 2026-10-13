"use client";

import Link from "next/link";
import { Spade } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePoker } from "@/lib/poker-demo/store";

export function PokerHeader() {
  const { state } = usePoker();
  const caixaAberto = state.caixa.status === "aberto";

  return (
    <header className="border-b border-border/50 bg-card/60">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/poker" className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-primary/30">
            <Spade className="size-5" fill="currentColor" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-heading text-lg tracking-wide uppercase">WB Poker</span>
            <span className="text-xs text-muted-foreground">Texas Beer</span>
          </span>
        </Link>
        <div className="flex items-center gap-3 text-right">
          <Badge variant={caixaAberto ? "default" : "destructive"}>
            {caixaAberto ? "Caixa aberto" : "Caixa fechado"}
          </Badge>
          <span className="flex flex-col leading-tight">
            <span className="text-xs text-muted-foreground">Usuário</span>
            <span className="font-heading text-sm tracking-wide uppercase">{state.operador}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
