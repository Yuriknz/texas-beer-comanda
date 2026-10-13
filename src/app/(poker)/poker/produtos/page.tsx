"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Search, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageTitle } from "@/components/poker/page-title";
import { ProdutoDialog } from "@/components/poker/produto-dialog";
import { usePoker } from "@/lib/poker-demo/store";
import type { Produto } from "@/lib/poker-demo/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

function Indicador({ rotulo, valor, className }: { rotulo: string; valor: number; className?: string }) {
  return (
    <Card className="gap-1 p-4">
      <span className="text-xs text-muted-foreground">{rotulo}</span>
      <span className={cn("font-money text-2xl", className)}>{valor}</span>
    </Card>
  );
}

export default function ProdutosPage() {
  const { state, actions } = usePoker();
  const [busca, setBusca] = useState("");
  // `produto` continua preenchido enquanto o Dialog fecha, para o título não piscar na animação
  const [dialogo, setDialogo] = useState<{ open: boolean; produto?: Produto }>({ open: false });

  const disponiveis = state.produtos.filter((p) => p.disponivel).length;
  const categorias = [...new Set(state.produtos.map((p) => p.categoria))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  const termo = busca.trim().toLowerCase();
  const grupos = categorias
    .map((categoria) => ({
      categoria,
      produtos: state.produtos
        .filter((p) => p.categoria === categoria)
        .filter((p) => !termo || `${p.nome} ${p.categoria}`.toLowerCase().includes(termo))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    }))
    .filter((grupo) => grupo.produtos.length > 0);

  function alternar(produto: Produto) {
    const resultado = actions.atualizarProduto(produto.id, { disponivel: !produto.disponivel });
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(
      `${produto.nome}: ${produto.disponivel ? "marcado como indisponível" : "disponível de novo"}.`
    );
  }

  return (
    <>
      <PageTitle title="Produtos" description="Cardápio do poker: o que pode ser lançado nas contas.">
        <Button className="h-11 px-4" onClick={() => setDialogo({ open: true })}>
          <Plus /> Novo produto
        </Button>
      </PageTitle>

      <div className="grid grid-cols-3 gap-3">
        <Indicador rotulo="Produtos" valor={state.produtos.length} />
        <Indicador rotulo="Disponíveis" valor={disponiveis} className="text-emerald-400" />
        <Indicador
          rotulo="Indisponíveis"
          valor={state.produtos.length - disponiveis}
          className={state.produtos.length - disponiveis > 0 ? "text-destructive" : undefined}
        />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Buscar produto"
          placeholder="Buscar por nome ou categoria"
          className="h-11 pl-9"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
        />
      </div>

      {grupos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <SearchX className="size-10" />
          <span>
            {state.produtos.length === 0
              ? "Nenhum produto cadastrado."
              : `Nenhum produto encontrado para “${busca.trim()}”.`}
          </span>
          {termo && (
            <Button variant="outline" className="h-11 px-4" onClick={() => setBusca("")}>
              Limpar busca
            </Button>
          )}
        </div>
      ) : (
        grupos.map((grupo) => (
          <section key={grupo.categoria} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-base text-primary">{grupo.categoria}</h3>
              <span className="text-xs text-muted-foreground">{grupo.produtos.length} produto(s)</span>
            </div>
            <Card className="gap-0 divide-y divide-border/60 p-0">
              {grupo.produtos.map((produto) => (
                <div
                  key={produto.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3"
                >
                  <div className={cn("min-w-0 flex-1 basis-40", !produto.disponivel && "opacity-60")}>
                    <div className="truncate font-medium">{produto.nome}</div>
                    <div className="font-money text-lg text-primary">{formatCurrency(produto.preco)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      role="switch"
                      aria-checked={produto.disponivel}
                      aria-label={`${produto.nome} disponível`}
                      variant={produto.disponivel ? "outline" : "destructive"}
                      className={cn("h-11 w-32", produto.disponivel && "text-emerald-400 hover:text-emerald-400")}
                      onClick={() => alternar(produto)}
                    >
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          produto.disponivel ? "bg-emerald-400" : "bg-destructive"
                        )}
                      />
                      {produto.disponivel ? "Disponível" : "Indisponível"}
                    </Button>
                    <Button
                      variant="outline"
                      className="size-11"
                      aria-label={`Editar ${produto.nome}`}
                      onClick={() => setDialogo({ open: true, produto })}
                    >
                      <Pencil />
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          </section>
        ))
      )}

      <ProdutoDialog
        open={dialogo.open}
        onOpenChange={(open) => setDialogo((atual) => ({ ...atual, open }))}
        produto={dialogo.produto}
        categorias={categorias}
      />
    </>
  );
}
