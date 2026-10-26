"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DadosAparelhoCard } from "@/components/poker/dados-aparelho-card";
import { PageTitle } from "@/components/poker/page-title";
import { usePoker } from "@/lib/poker-demo/store";

const TAMANHO_MINIMO = 4;

export default function SenhaPage() {
  const { state, actions } = usePoker();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrar, setMostrar] = useState(false);

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

  const tipo = mostrar ? "text" : "password";

  return (
    <>
      <PageTitle title="Senha e backup" description={`Senha do operador ${state.operador} e os dados deste aparelho.`} />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alterar senha</CardTitle>
            <CardDescription>
              Mínimo de {TAMANHO_MINIMO} caracteres.
              {state.senha === "1234" && (
                <>
                  {" "}
                  A senha de demonstração é <span className="font-money text-foreground">1234</span>.
                </>
              )}
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

        <DadosAparelhoCard />
      </div>
    </>
  );
}
