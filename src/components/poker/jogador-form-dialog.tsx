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
import { PIN_MAX_ERROS, type Jogador } from "@/lib/poker-demo/types";

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
  const [pin, setPin] = useState("");
  const [senhaGerente, setSenhaGerente] = useState("");

  const pinBloqueado = (jogador?.pinErros ?? 0) >= PIN_MAX_ERROS;
  // trocar um PIN que já existe exige o gerente; criar o primeiro, não
  const trocandoPin = Boolean(jogador?.pin) && pin.length > 0;

  function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pin && pin.length !== 4) {
      toast.error("O PIN precisa ter 4 dígitos.");
      return;
    }
    const dados = { nome, apelido: apelido.trim(), telefone: telefone.trim(), cpf: cpf.trim() };
    if (jogador && pin) {
      const troca = actions.redefinirPin(jogador.id, pin, senhaGerente);
      if (!troca.ok) {
        toast.error(troca.error);
        return;
      }
    }
    const resultado = jogador
      ? actions.atualizarJogador(jogador.id, dados)
      : actions.criarJogador({ ...dados, pin });
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="jogador-pin">{jogador?.pin ? "Novo PIN" : "PIN (4 dígitos)"}</Label>
          <Input
            id="jogador-pin"
            type="password"
            className="h-11"
            inputMode="numeric"
            autoComplete="off"
            placeholder={jogador?.pin ? "Deixe vazio para manter" : "O jogador digita"}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </div>
        {trocandoPin && (
          <div className="grid gap-2">
            <Label htmlFor="jogador-senha-gerente">Senha de gerente</Label>
            <Input
              id="jogador-senha-gerente"
              type="password"
              className="h-11"
              inputMode="numeric"
              autoComplete="off"
              value={senhaGerente}
              onChange={(event) => setSenhaGerente(event.target.value)}
            />
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {pinBloqueado
          ? "PIN bloqueado por 3 erros seguidos. Defina um novo PIN com a senha de gerente para liberar."
          : jogador?.pin
            ? "O PIN autoriza buy-in, rebuy, add-on e cacife. Trocar exige a senha de gerente."
            : "O PIN autoriza buy-in, rebuy, add-on e cacife. Sem PIN, o jogador cria um no primeiro lançamento."}
      </p>
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
