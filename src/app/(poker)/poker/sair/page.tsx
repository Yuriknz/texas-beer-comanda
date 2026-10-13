"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePoker } from "@/lib/poker-demo/store";

// No protótipo "Sair" só bloqueia a tela; o login real (Supabase Auth) entra
// quando o módulo for ligado ao banco.
export default function SairPage() {
  const { state } = usePoker();
  const [senha, setSenha] = useState("");
  const router = useRouter();

  function entrar(event: React.FormEvent) {
    event.preventDefault();
    if (senha !== state.senha) {
      toast.error("Senha incorreta.");
      return;
    }
    router.push("/poker");
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-sm items-center gap-4 p-6 text-center">
        <LockKeyhole className="size-10 text-primary" />
        <div>
          <h2 className="text-xl">Sessão encerrada</h2>
          <p className="text-sm text-muted-foreground">
            Digite a senha do operador {state.operador} para voltar.
          </p>
        </div>
        <form onSubmit={entrar} className="flex w-full flex-col gap-3 text-left">
          <div className="space-y-1.5">
            <Label htmlFor="senha-bloqueio">Senha</Label>
            <Input
              id="senha-bloqueio"
              type="password"
              inputMode="numeric"
              autoFocus
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
            />
          </div>
          <Button type="submit" size="lg" disabled={!senha}>
            Entrar
          </Button>
        </form>
        {state.senha === "1234" && (
          <p className="text-xs text-muted-foreground">Senha de demonstração: 1234</p>
        )}
      </Card>
    </div>
  );
}
