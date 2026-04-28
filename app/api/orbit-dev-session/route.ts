import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ORBIT_DEV_SESSION_COOKIE,
  encodeDevSessionPayload,
} from "@/lib/auth/dev-session";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";

/** Local session: sign in without Supabase when env keys are missing. */
export async function POST(request: Request) {
  if (getSupabasePublicConfig().ready) {
    return NextResponse.json({ error: "Cloud sign-in is already configured for this app." }, { status: 400 });
  }

  let body: { email?: string; username?: string | null; displayName?: string | null; bio?: string | null };
  try {
    body = (await request.json()) as {
      email?: string;
      username?: string | null;
      displayName?: string | null;
      bio?: string | null;
    };
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
  const displayName =
    typeof body.displayName === "string" && body.displayName.trim().length > 0 ? body.displayName.trim() : null;
  const bio = typeof body.bio === "string" && body.bio.trim().length > 0 ? body.bio.trim() : null;

  const value = encodeDevSessionPayload({ email, username, displayName, bio });
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
  const jar = await cookies();
  jar.delete(ORBIT_DEV_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
