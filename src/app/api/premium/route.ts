/* ═══════════════════════════════════════════════════════════
 * GET  /api/premium  — check subscription status
 * POST /api/premium  — subscribe (mock — no real Stripe)
 * DELETE /api/premium — cancel subscription
 *
 * ⚠️ Standard (non-Edge) Runtime — required for cookie access.
 * Do NOT add "export const runtime = 'edge'" here.
 * ═══════════════════════════════════════════════════════════ */
export const dynamic = "force-dynamic"; // opt out of static generation

import { NextRequest, NextResponse } from "next/server";
import { getPremiumState, subscribePremium, cancelPremium } from "@/lib/premium";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function setPremiumCookie(res: NextResponse, active: boolean) {
  if (active) {
    res.cookies.set("vietfi_premium", "active", {
      httpOnly: false,             // readable by client JS — Phase 2 compromise
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
    });
  } else {
    res.cookies.delete("vietfi_premium");
  }
}

// GET — check subscription status
export async function GET(_req: NextRequest) {
  const state = getPremiumState();
  const res = NextResponse.json({
    active: state.active,
    tier: state.tier,
    subscribedAt: state.subscribedAt,
    expiresAt: state.expiresAt,
  });
  setPremiumCookie(res, state.active);
  return res;
}

// POST — subscribe (mock — no real Stripe)
export async function POST(req: NextRequest) {
  let promoCode: string | undefined;
  try {
    const body = await req.json();
    promoCode = typeof body.promoCode === "string" ? body.promoCode : undefined;
  } catch { /* empty body */ }

  const state = subscribePremium(promoCode);
  const res = NextResponse.json({ success: true, ...state }, { status: 200 });
  setPremiumCookie(res, state.active);
  return res;
}

// DELETE — cancel (awaits because cancelPremium is async for cookie cleanup)
export async function DELETE(_req: NextRequest) {
  const state = await cancelPremium();
  const res = NextResponse.json({ success: true, ...state }, { status: 200 });
  setPremiumCookie(res, false);
  return res;
}
