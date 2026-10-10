"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Database } from "@/lib/supabase/types";
import { atualizarUsuario } from "./actions";

type UserRole = Database["public"]["Enums"]["user_role"];

type Usuario = {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
};

const ROLES: { value: UserRole; label: string }[] = [
  { value: "garcom", label: "Garçom" },
  { value: "operador_poker", label: "Torneios" },
  { value: "admin", label: "Admin" },
];

export function UsuariosLista({ usuarios }: { usuarios: Usuario[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleAtualizar(usuarioId: string, dados: { role?: UserRole; ativo?: boolean }) {
    startTransition(async () => {
      const result = await atualizarUsuario(usuarioId, dados);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (usuarios.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado ainda.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {usuarios.map((usuario) => (
          <TableRow key={usuario.id}>
            <TableCell>{usuario.nome}</TableCell>
            <TableCell>{usuario.email}</TableCell>
            <TableCell>
              <div className="flex gap-1">
                {ROLES.map((opcao) => (
                  <Button
                    key={opcao.value}
                    size="sm"
                    variant={usuario.role === opcao.value ? "default" : "outline"}
                    disabled={isPending}
                    onClick={() => handleAtualizar(usuario.id, { role: opcao.value })}
                  >
                    {opcao.label}
                  </Button>
                ))}
              </div>
            </TableCell>
            <TableCell>
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => handleAtualizar(usuario.id, { ativo: !usuario.ativo })}
              >
                <Badge variant={usuario.ativo ? "default" : "destructive"}>
                  {usuario.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
