import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const sessionCookie = request.cookies.get("better-auth.session_token");
    const isGuest = request.cookies.get("vietfi_guest")?.value === "true";

    // Only redirect if no session AND no guest cookie, AND the path isn't already /login
    if (!sessionCookie && !isGuest && !request.nextUrl.pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*"],
};
