import { requireRole } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export default async function TorneiosLayout({ children }: { children: React.ReactNode }) {
  const usuario = await requireRole(["operador_poker", "admin"]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <h1 className="text-lg">Texas Beer — Torneios</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{usuario.nome}</span>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
