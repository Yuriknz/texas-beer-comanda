"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Database } from "@/lib/supabase/types";
import { criarUsuario } from "./actions";

type UserRole = Database["public"]["Enums"]["user_role"];

const ROLES: { value: UserRole; label: string }[] = [
  { value: "garcom", label: "Garçom" },
  { value: "operador_poker", label: "Operador de torneio" },
  { value: "admin", label: "Admin" },
];

export function NovoUsuarioDialog() {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState<UserRole>("garcom");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCriar() {
    startTransition(async () => {
      const result = await criarUsuario({ nome, email, senha, role });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setNome("");
      setEmail("");
      setSenha("");
      setRole("garcom");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Novo usuário</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="usuario-nome">Nome</Label>
            <Input id="usuario-nome" value={nome} onChange={(event) => setNome(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="usuario-email">Email</Label>
            <Input
              id="usuario-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="usuario-senha">Senha inicial</Label>
            <Input
              id="usuario-senha"
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <div className="flex gap-2">
              {ROLES.map((opcao) => (
                <Button
                  key={opcao.value}
                  type="button"
                  variant={role === opcao.value ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setRole(opcao.value)}
                >
                  {opcao.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={isPending || !nome.trim() || !email.trim() || senha.length < 6}
            onClick={handleCriar}
          >
            {isPending ? "Criando…" : "Criar usuário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
