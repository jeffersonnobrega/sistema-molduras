import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rotas públicas
const PUBLIC_ROUTES = ["/admin/reset-password", "/auth/callback", "/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ✅ libera rotas públicas
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // ✅ supabase SSR
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
        },
      },
    },
  );

  // ✅ sessão
  const result = await supabase.auth.getSession();
  const session = result?.data?.session ?? null;
  const user = session?.user ?? null;

  // ✅ proteção admin (produção + teste compatível)
  if (!user && pathname.startsWith("/admin")) {
    const base =
      request.url && request.url.startsWith("http")
        ? request.url
        : "http://localhost";

    const loginUrl = new URL("/login", base);

    // preserva rota original
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/auth/:path*"],
};
