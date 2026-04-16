import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCanonicalAppOrigin, safeRedirectPath } from "@/lib/security/origin";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"), "/dashboard");
  const redirectUrl = new URL(next, getCanonicalAppOrigin());

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=Auth%20callback%20is%20missing%20code", getCanonicalAppOrigin()));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=Auth%20callback%20failed", getCanonicalAppOrigin()));
  }

  return NextResponse.redirect(redirectUrl);
}
