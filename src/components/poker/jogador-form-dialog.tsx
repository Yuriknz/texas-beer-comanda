"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
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
import type { Jogador } from "@/lib/poker-demo/types";

function mascararCpf(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

function mascararTelefone(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  // celular tem 9 dígitos, fixo tem 8
  const corte = resto.length > 8 ? 5 : 4;
  if (resto.length <= corte) return `(${ddd}) ${resto}`;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

export function JogadorFormDialog({
  open,
  onOpenChange,
  jogador,
  nomeInicial = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** ausente = cadastro de jogador novo */
  jogador?: Jogador;
  nomeInicial?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{jogador ? "Editar jogador" : "Novo jogador"}</DialogTitle>
          <DialogDescription>
            Só o nome é obrigatório. O CPF sai na NFC-e quando o jogador pedir nota.
          </DialogDescription>
        </DialogHeader>
        {/* O conteúdo só existe com o diálogo aberto, então o formulário nasce
            sempre com os dados atuais, sem precisar sincronizar por efeito. */}
        <JogadorForm
          key={jogador?.id ?? "novo"}
          jogador={jogador}
          nomeInicial={nomeInicial}
          onConcluir={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function JogadorForm({
  jogador,
  nomeInicial,
  onConcluir,
}: {
  jogador?: Jogador;
  nomeInicial: string;
  onConcluir: () => void;
}) {
  const { actions } = usePoker();
  const [nome, setNome] = useState(jogador?.nome ?? nomeInicial);
  const [apelido, setApelido] = useState(jogador?.apelido ?? "");
  const [telefone, setTelefone] = useState(jogador?.telefone ?? "");
  const [cpf, setCpf] = useState(jogador?.cpf ?? "");

  function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dados = { nome, apelido: apelido.trim(), telefone: telefone.trim(), cpf: cpf.trim() };
    const resultado = jogador
      ? actions.atualizarJogador(jogador.id, dados)
      : actions.criarJogador(dados);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success(jogador ? "Jogador atualizado." : "Jogador cadastrado.");
    onConcluir();
  }

  return (
    <form onSubmit={salvar} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="jogador-nome">Nome</Label>
        <Input
          id="jogador-nome"
          autoFocus
          required
          className="h-11"
          autoComplete="off"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="jogador-apelido">Apelido</Label>
        <Input
          id="jogador-apelido"
          className="h-11"
          autoComplete="off"
          value={apelido}
          onChange={(event) => setApelido(event.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="jogador-telefone">Telefone</Label>
          <Input
            id="jogador-telefone"
            className="h-11"
            inputMode="tel"
            autoComplete="off"
            placeholder="(11) 90000-0000"
            value={telefone}
            onChange={(event) => setTelefone(mascararTelefone(event.target.value))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="jogador-cpf">CPF</Label>
          <Input
            id="jogador-cpf"
            className="h-11"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(event) => setCpf(mascararCpf(event.target.value))}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" className="h-11 px-4" onClick={onConcluir}>
          Cancelar
        </Button>
        <Button type="submit" className="h-11 px-4">
          {jogador ? "Salvar" : "Cadastrar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
