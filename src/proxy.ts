import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Protótipo do módulo de poker: roda com dados locais do navegador, sem
  // login nem Supabase. Remover esta exceção quando o módulo for ligado ao banco.
  if (request.nextUrl.pathname.startsWith("/poker")) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // refresca a sessão se necessário (obrigatório para Server Components lerem o usuário atual)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Checagem otimista (só a partir da sessão, sem consultar `usuarios`): a
  // checagem de role fica por conta de requireRole() nas páginas/layouts.
  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/login";

  // Login por email e senha desligado por enquanto: sem sessão, tudo (inclusive
  // /login) cai no protótipo do poker. Para religar, voltar a mandar para "/login".
  if (!user) {
    return NextResponse.redirect(new URL("/poker", request.url));
  }

  if (isLoginRoute) {
    return NextResponse.redirect(new URL("/mesas", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:png|svg)$).*)"],
};
