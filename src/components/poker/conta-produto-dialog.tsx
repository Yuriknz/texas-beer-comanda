"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Beer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePoker } from "@/lib/poker-demo/store";
import type { Produto } from "@/lib/poker-demo/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ContaProdutoDialog({ contaId }: { contaId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="h-14 text-base" />}>
        <Beer className="size-5" /> Lançar produto
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lançar produto</DialogTitle>
          <DialogDescription>Cada toque lança 1 unidade na conta.</DialogDescription>
        </DialogHeader>
        {/* montado só com o diálogo aberto: a contagem da sessão zera a cada abertura */}
        <ProdutoGrade contaId={contaId} onConcluir={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ProdutoGrade({ contaId, onConcluir }: { contaId: string; onConcluir: () => void }) {
  const { state, actions } = usePoker();
  const [lancados, setLancados] = useState<Record<string, number>>({});

  const disponiveis = state.produtos.filter((p) => p.disponivel);
  const categorias = [...new Set(disponiveis.map((p) => p.categoria))];
  const quantidade = Object.values(lancados).reduce((soma, n) => soma + n, 0);
  const valor = state.produtos.reduce((soma, p) => soma + (lancados[p.id] ?? 0) * p.preco, 0);

  function lancar(produto: Produto) {
    const resultado = actions.lancarProduto(contaId, produto.id, 1);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    setLancados((atual) => ({ ...atual, [produto.id]: (atual[produto.id] ?? 0) + 1 }));
  }

  return (
    <>
      <div className="-mx-4 flex flex-col gap-4 overflow-y-auto px-4 py-1">
        {disponiveis.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">
            Nenhum produto disponível. Cadastre em Produtos.
          </p>
        )}
        {categorias.map((categoria) => (
          <section key={categoria} className="flex flex-col gap-2">
            <h3 className="text-xs tracking-wider text-muted-foreground">{categoria}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {disponiveis
                .filter((p) => p.categoria === categoria)
                .map((produto) => {
                  const vezes = lancados[produto.id] ?? 0;
                  return (
                    <button
                      key={produto.id}
                      type="button"
                      onClick={() => lancar(produto)}
                      className={cn(
                        "relative flex min-h-20 flex-col justify-between gap-1 rounded-lg border p-3 text-left transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97]",
                        vezes > 0
                          ? "border-primary/60 bg-primary/10"
                          : "border-border bg-muted/40 hover:bg-muted"
                      )}
                    >
                      <span className="pr-7 text-sm leading-tight font-medium">{produto.nome}</span>
                      <span className="font-money text-base text-primary">
                        {formatCurrency(produto.preco)}
                      </span>
                      {vezes > 0 && (
                        <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {vezes}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
      <DialogFooter className="flex-row items-center justify-between sm:justify-between">
        <div className="text-sm text-muted-foreground" aria-live="polite">
          {quantidade === 0 ? (
            "Nada lançado ainda"
          ) : (
            <>
              {quantidade} {quantidade > 1 ? "itens lançados" : "item lançado"} ·{" "}
              <span className="font-money text-foreground">{formatCurrency(valor)}</span>
            </>
          )}
        </div>
        <Button className="h-11 px-6 text-base" onClick={onConcluir}>
          Concluir
        </Button>
      </DialogFooter>
    </>
  );
}
