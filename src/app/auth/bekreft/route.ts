import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** The e-mail template decides which of these two arrives; both are handled. */
type OtpType = "magiclink" | "signup" | "email" | "recovery" | "invite" | "email_change";
const OTP_TYPES: readonly string[] = [
  "magiclink",
  "signup",
  "email",
  "recovery",
  "invite",
  "email_change",
];

/** Only same-site paths, so a crafted link cannot bounce someone elsewhere. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/min-fryser";
  return value;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("next"));
  const supabase = await createClient();

  const code = params.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as OtpType,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(new URL("/auth/feil", request.url));
}
