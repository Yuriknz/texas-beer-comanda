"use client";

import Link from "next/link";
import {
  Beer,
  CircleDollarSign,
  FolderOpen,
  KeyRound,
  LogOut,
  ReceiptText,
  Store,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { NovaContaDialog } from "@/components/poker/nova-conta-dialog";
import { totalConta } from "@/lib/poker-demo/calc";
import { usePoker } from "@/lib/poker-demo/store";
import { formatCurrency, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// Mesma ordem do menu do sistema atual do WB Poker.
const MENU: { href: string; label: string; icon: LucideIcon; destaque?: "sair" }[] = [
  { href: "/poker/caixa", label: "Meu Caixa", icon: Store },
  { href: "/poker/jogadores", label: "Jogadores", icon: Users },
  { href: "/poker/produtos", label: "Produtos", icon: Beer },
  { href: "/poker/cacifes", label: "Cacifes", icon: CircleDollarSign },
  { href: "/poker/torneios", label: "Torneios", icon: Trophy },
  { href: "/poker/nota-fiscal", label: "Nota Fiscal", icon: ReceiptText },
  { href: "/poker/senha", label: "Senha e backup", icon: KeyRound },
  { href: "/poker/sair", label: "Sair", icon: LogOut, destaque: "sair" },
];

export default function PokerHomePage() {
  const { state } = usePoker();
  const contasAbertas = state.contas
    .filter((conta) => conta.status === "aberta")
    .sort((a, b) => a.numero - b.numero);
  const totalEmAberto = contasAbertas.reduce((soma, conta) => soma + totalConta(conta), 0);

  return (
    <>
      <nav className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MENU.map(({ href, label, icon: Icon, destaque }) => (
          <Link key={href} href={href}>
            <Card className="items-center gap-2 p-4 text-center transition-all hover:-translate-y-0.5 hover:ring-primary/40 active:translate-y-0">
              <Icon className={cn("size-7", destaque === "sair" ? "text-destructive" : "text-primary")} />
              <span className="font-heading text-sm tracking-wide uppercase">{label}</span>
            </Card>
          </Link>
        ))}
      </nav>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl">Contas abertas</h2>
            <p className="text-sm text-muted-foreground">
              {contasAbertas.length} conta(s) ·{" "}
              <span className="font-money">{formatCurrency(totalEmAberto)}</span> em aberto
            </p>
          </div>
          <NovaContaDialog />
        </div>

        {contasAbertas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <FolderOpen className="size-10" />
            <span>Nenhuma conta encontrada.</span>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contasAbertas.map((conta) => {
              const jogador = state.jogadores.find((j) => j.id === conta.jogadorId);
              const total = totalConta(conta);
              return (
                <Link key={conta.id} href={`/poker/contas/${conta.id}`}>
                  <Card className="gap-3 p-4 transition-all hover:-translate-y-0.5 hover:ring-primary/40 active:translate-y-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{jogador?.nome ?? "Jogador"}</div>
                        <div className="text-xs text-muted-foreground">
                          Conta #{conta.numero} · aberta às {formatTime(conta.abertaEm)}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {conta.lancamentos.length} itens
                      </span>
                    </div>
                    <div
                      className={cn(
                        "font-money text-2xl",
                        total < 0 ? "text-emerald-400" : "text-primary"
                      )}
                    >
                      {formatCurrency(total)}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
