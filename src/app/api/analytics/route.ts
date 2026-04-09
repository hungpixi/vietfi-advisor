/* ═══════════════════════════════════════════════════════════
 * POST /api/analytics — flush affiliate analytics queue
 * Receives array of typed AnalyticsEvent from client.
 * Phase 3 stub: logs to console until Supabase is wired up.
 * ═══════════════════════════════════════════════════════════ */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import type { AnalyticsEvent } from "@/lib/affiliate/analytics";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events: AnalyticsEvent[] = Array.isArray(body) ? body : [];

    // Phase 3 stub: log events. Wire to Supabase analytics table here.
    if (events.length > 0) {
      console.log("[analytics] flush:", JSON.stringify(events));
    }

    return NextResponse.json({ success: true, count: events.length }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 });
  }
}
