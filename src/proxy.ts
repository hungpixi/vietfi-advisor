import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const redirects: Record<string, string> = {
  "/dashboard/budget": "/dashboard/cashflow?tab=budget",
  "/dashboard/ledger": "/dashboard/cashflow?tab=ledger",
  "/dashboard/personal-cpi": "/dashboard/spending-insights?tab=inflation",
};

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const destination = redirects[pathname];

  if (destination) {
    const url = request.nextUrl.clone();
    url.pathname = destination;
    return NextResponse.redirect(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/budget",
    "/dashboard/ledger",
    "/dashboard/personal-cpi",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|mp3|wav|lottie)$).*)",
  ],
};
