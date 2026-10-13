"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePoker } from "@/lib/poker-demo/store";
import type { Produto } from "@/lib/poker-demo/types";

/** Aceita "12,50" e "12.50"; devolve null quando não é um preço válido. */
function lerPreco(texto: string): number | null {
  const limpo = texto.trim().replace(",", ".");
  if (!limpo) return null;
  const valor = Number(limpo);
  if (!Number.isFinite(valor) || valor < 0) return null;
  return Math.round(valor * 100) / 100;
}

function ProdutoForm({
  produto,
  categorias,
  onSalvo,
}: {
  produto?: Produto;
  categorias: string[];
  onSalvo: () => void;
}) {
  const { actions } = usePoker();
  const [nome, setNome] = useState(produto?.nome ?? "");
  const [categoria, setCategoria] = useState(produto?.categoria ?? "");
  const [precoTexto, setPrecoTexto] = useState(
    produto ? produto.preco.toFixed(2).replace(".", ",") : ""
  );

  const preco = lerPreco(precoTexto);
  const precoInvalido = precoTexto.trim() !== "" && preco === null;
  const podeSalvar = nome.trim() !== "" && categoria.trim() !== "" && preco !== null;

  function salvar(event: React.FormEvent) {
    event.preventDefault();
    if (preco === null) return;
    const dados = { nome: nome.trim(), categoria: categoria.trim(), preco };
    const resultado = produto
      ? actions.atualizarProduto(produto.id, dados)
      : actions.criarProduto({ ...dados, disponivel: true });
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(produto ? "Produto atualizado." : "Produto cadastrado.");
    onSalvo();
  }

  return (
    <form onSubmit={salvar} className="grid gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="produto-nome">Nome</Label>
        <Input
          id="produto-nome"
          autoFocus={!produto}
          className="h-11"
          placeholder="Ex.: Chopp Pilsen 500ml"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="produto-categoria">Categoria</Label>
        <Input
          id="produto-categoria"
          className="h-11"
          placeholder="Escolha abaixo ou digite uma nova"
          value={categoria}
          onChange={(event) => setCategoria(event.target.value)}
        />
        {categorias.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {categorias.map((opcao) => (
              <Button
                key={opcao}
                type="button"
                variant={categoria.trim() === opcao ? "default" : "outline"}
                className="h-10 px-3"
                onClick={() => setCategoria(opcao)}
              >
                {opcao}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="produto-preco">Preço (R$)</Label>
        <Input
          id="produto-preco"
          className="h-11 font-money"
          inputMode="decimal"
          placeholder="0,00"
          aria-invalid={precoInvalido}
          value={precoTexto}
          onChange={(event) => setPrecoTexto(event.target.value)}
        />
        {precoInvalido && <p className="text-xs text-destructive">Informe um preço válido.</p>}
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" className="h-11 px-4" />}>
          Cancelar
        </DialogClose>
        <Button type="submit" className="h-11 px-4" disabled={!podeSalvar}>
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ProdutoDialog({
  open,
  onOpenChange,
  produto,
  categorias,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** ausente = cadastro de produto novo */
  produto?: Produto;
  categorias: string[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{produto ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>
            {produto
              ? "A mudança de preço vale para os próximos lançamentos; o que já está nas contas não muda."
              : "O produto entra no cardápio como disponível."}
          </DialogDescription>
        </DialogHeader>
        {/* o conteúdo do Dialog é desmontado ao fechar, então o formulário sempre abre zerado */}
        <ProdutoForm
          key={produto?.id ?? "novo"}
          produto={produto}
          categorias={categorias}
          onSalvo={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
