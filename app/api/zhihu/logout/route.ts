import { NextResponse } from "next/server";
import { clearAppSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  await clearAppSessionCookie();
  return NextResponse.json({ ok: true });
}
