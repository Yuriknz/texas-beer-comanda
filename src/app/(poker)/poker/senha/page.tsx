"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTitle } from "@/components/poker/page-title";
import { usePoker } from "@/lib/poker-demo/store";

const TAMANHO_MINIMO = 4;

export default function SenhaPage() {
  const { state, actions } = usePoker();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [resetAberto, setResetAberto] = useState(false);

  const novaCurta = nova !== "" && nova.length < TAMANHO_MINIMO;
  const novaIgual = nova !== "" && nova === atual;
  const naoConfere = confirmacao !== "" && confirmacao !== nova;
  const podeSalvar =
    atual !== "" && nova.length >= TAMANHO_MINIMO && !novaIgual && confirmacao === nova;

  function salvar(event: React.FormEvent) {
    event.preventDefault();
    if (!podeSalvar) return;
    const resultado = actions.alterarSenha(atual, nova);
    if (!resultado.ok) {
      toast.error(resultado.error);
      return;
    }
    toast.success("Senha alterada.");
    setAtual("");
    setNova("");
    setConfirmacao("");
  }

  function restaurar() {
    actions.resetarDemo();
    setResetAberto(false);
    setAtual("");
    setNova("");
    setConfirmacao("");
    toast.success("Dados de exemplo restaurados.");
  }

  const tipo = mostrar ? "text" : "password";

  return (
    <>
      <PageTitle title="Senha" description={`Troca da senha do operador ${state.operador}.`} />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alterar senha</CardTitle>
            <CardDescription>
              Mínimo de {TAMANHO_MINIMO} caracteres. A senha de demonstração é{" "}
              <span className="font-money text-foreground">1234</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={salvar} className="grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="senha-atual">Senha atual</Label>
                <Input
                  id="senha-atual"
                  type={tipo}
                  autoComplete="current-password"
                  className="h-11"
                  value={atual}
                  onChange={(event) => setAtual(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="senha-nova">Nova senha</Label>
                <Input
                  id="senha-nova"
                  type={tipo}
                  autoComplete="new-password"
                  className="h-11"
                  aria-invalid={novaCurta || novaIgual}
                  value={nova}
                  onChange={(event) => setNova(event.target.value)}
                />
                {novaCurta && (
                  <p className="text-xs text-destructive">
                    A nova senha precisa de pelo menos {TAMANHO_MINIMO} caracteres.
                  </p>
                )}
                {novaIgual && (
                  <p className="text-xs text-destructive">A nova senha precisa ser diferente da atual.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="senha-confirmacao">Confirmar nova senha</Label>
                <Input
                  id="senha-confirmacao"
                  type={tipo}
                  autoComplete="new-password"
                  className="h-11"
                  aria-invalid={naoConfere}
                  value={confirmacao}
                  onChange={(event) => setConfirmacao(event.target.value)}
                />
                {naoConfere && <p className="text-xs text-destructive">A confirmação não confere com a nova senha.</p>}
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 px-3"
                  aria-pressed={mostrar}
                  onClick={() => setMostrar((valor) => !valor)}
                >
                  {mostrar ? <EyeOff /> : <Eye />}
                  {mostrar ? "Ocultar senhas" : "Mostrar senhas"}
                </Button>
                <Button type="submit" className="h-11 px-5" disabled={!podeSalvar}>
                  Salvar nova senha
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados de demonstração</CardTitle>
            <CardDescription>
              Recomeça a apresentação do zero: jogadores, contas, caixa, torneios, notas e produtos voltam ao
              exemplo original, e a senha volta a ser 1234.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={resetAberto} onOpenChange={setResetAberto}>
              <DialogTrigger render={<Button variant="outline" className="h-11 w-full px-4 sm:w-auto" />}>
                <RotateCcw /> Restaurar dados de exemplo
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Restaurar dados de exemplo?</DialogTitle>
                  <DialogDescription>
                    Tudo o que foi lançado neste aparelho durante a demonstração será apagado. Esta ação não
                    pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" className="h-11 px-4" />}>Cancelar</DialogClose>
                  <Button variant="destructive" className="h-11 px-4" onClick={restaurar}>
                    Restaurar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
