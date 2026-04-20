import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

// Danh sách các điều hướng cũ từ proxy.ts
const redirects: Record<string, { pathname: string; search?: string }> = {
    "/dashboard/budget": { pathname: "/dashboard/cashflow", search: "?tab=budget" },
    "/dashboard/ledger": { pathname: "/dashboard/cashflow", search: "?tab=ledger" },
    "/dashboard/personal-cpi": { pathname: "/dashboard/spending-insights", search: "?tab=inflation" },
    "/dashboard/sentiment": { pathname: "/dashboard/market-overview", search: "?tab=tam-ly" },
    "/dashboard/market": { pathname: "/dashboard/market-overview", search: "?tab=tai-san" },
    "/dashboard/macro": { pathname: "/dashboard/market-overview", search: "?tab=vi-mo" },
};

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Handle redirects first
    const destination = redirects[pathname];
    if (destination) {
        const url = request.nextUrl.clone();
        url.pathname = destination.pathname;
        if (destination.search) url.search = destination.search;
        return NextResponse.redirect(url);
    }

    // 2. Clear out public paths and auth paths
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/auth/login');
    const isPublicStaticPath = pathname === "/" ||
        pathname.startsWith('/auth/callback') ||
        pathname.startsWith('/api/auth');

    // 3. Update session for all requests
    // Important: updateSession also refreshes the session if needed
    const response = await updateSession(request);

    // 4. Get updated session to make routing decisions
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const { createServerClient } = await import("@supabase/ssr");

    const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
        cookies: {
            getAll() { return request.cookies.getAll(); },
            setAll(cookiesToSet) { }, // setAll not needed for checking
        },
    });

    const { data: { user } } = await supabase.auth.getUser();
    const isGuest = request.cookies.get("vietfi_guest")?.value === "true";

    // 5. Auth logic
    // If logged in (or guest) and trying to access login page -> redirect to dashboard
    if ((user || isGuest) && isAuthPage) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // If NOT logged in (and not a guest) and trying to access dashboard -> redirect to login
    if (!user && !isGuest && pathname.startsWith('/dashboard')) {
        const url = new URL("/login", request.url);
        // Save history to redirect after login (optional)
        // url.searchParams.set("next", pathname); 
        return NextResponse.redirect(url);
    }

    return response;
}


export const config = {
    matcher: [
        /*
         * Khớp tất cả các đường dẫn ngoại trừ:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, assets, animations, v.v. (file trong public)
         */
        "/((?!api|_next/static|_next/image|favicon.ico|assets|animations|.*\\..*).*)",
    ],
};
