import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ORBIT_DEV_SESSION_COOKIE,
  encodeDevSessionPayload,
  isDevSessionAllowed,
} from "@/lib/auth/dev-session";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";

/** Local development only: sign in without Supabase when env keys are missing. */
export async function POST(request: Request) {
  if (!isDevSessionAllowed()) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }
  if (getSupabasePublicConfig().ready) {
    return NextResponse.json({ error: "Supabase is configured" }, { status: 400 });
  }

  let body: { email?: string; username?: string | null };
  try {
    body = (await request.json()) as { email?: string; username?: string | null };
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }
  const username =
    typeof body.username === "string" && body.username.trim().length > 0
      ? body.username.trim().toLowerCase()
      : null;

  const value = encodeDevSessionPayload({ email, username });
  const jar = await cookies();
  jar.set(ORBIT_DEV_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  if (!isDevSessionAllowed()) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }
  const jar = await cookies();
  jar.delete(ORBIT_DEV_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
