import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next.js 16 calls this Proxy; it used to be Middleware.
 *
 * It does exactly two things: it writes refreshed auth cookies back to the
 * response, and it sends a signed-out visitor to the login page before a
 * protected route renders. That second part is a convenience, not a security
 * boundary — the Next.js documentation is explicit that this is the wrong
 * place for authorization. The page's own requireUser() and the database's row
 * level security are what actually protect the data.
 *
 * The matcher deliberately leaves the landing page, the demo and the public
 * pages alone, so they keep being served as static files.
 */
const PROTECTED = ["/min-fryser", "/konto"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, headers) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
        // A response that carries auth cookies must not be cached anywhere.
        for (const [header, value] of Object.entries(headers ?? {}))
          response.headers.set(header, value);
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((route) => path === route || path.startsWith(route + "/"));

  if (!data.user && isProtected) {
    const target = request.nextUrl.clone();
    target.pathname = "/logg-inn";
    target.search = "";
    return NextResponse.redirect(target);
  }
  return response;
}

export const config = {
  matcher: ["/min-fryser/:path*", "/konto/:path*", "/logg-inn", "/auth/:path*"],
};
