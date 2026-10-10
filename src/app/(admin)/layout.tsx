import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/admin", label: "Início" },
  { href: "/admin/relatorios", label: "Relatórios" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/mesas", label: "Mesas" },
  { href: "/admin/usuarios", label: "Usuários" },
  { href: "/admin/notas-fiscais", label: "Notas fiscais" },
  { href: "/torneios", label: "Torneios" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const usuario = await requireRole(["admin"]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <h1 className="text-lg">Texas Beer — Admin</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{usuario.nome}</span>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-border/50 px-4 py-2">
        {NAV_LINKS.map((link) => (
          <Button
            key={link.href}
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href={link.href} />}
          >
            {link.label}
          </Button>
        ))}
      </nav>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
