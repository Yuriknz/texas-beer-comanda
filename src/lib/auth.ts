import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];

export type CurrentUsuario = {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
};

/** Home de cada role após login / ao tentar acessar uma rota fora do seu domínio. */
export const ROLE_HOME: Record<UserRole, string> = {
  garcom: "/mesas",
  admin: "/admin",
  operador_poker: "/torneios",
};

/**
 * Usuário autenticado + perfil de aplicação (usuarios.role). Memoizado por
 * request (React cache) para não repetir a query em Server Components e
 * Server Actions que chamam isso mais de uma vez no mesmo render.
 */
export const getCurrentUsuario = cache(async (): Promise<CurrentUsuario | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, nome, email, role, ativo")
    .eq("id", user.id)
    .single();

  if (!usuario || !usuario.ativo) return null;

  return { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role };
});

/**
 * Checagem de UX (redireciona pra uma tela sensata em vez de deixar a página
 * quebrada/vazia). A segurança de verdade é o RLS, já auditado na Fase 1.
 */
export async function requireRole(allowed: UserRole[]): Promise<CurrentUsuario> {
  const usuario = await getCurrentUsuario();

  if (!usuario) {
    redirect("/login");
  }

  if (!allowed.includes(usuario.role)) {
    redirect(ROLE_HOME[usuario.role]);
  }

  return usuario;
}
