import { NextResponse } from "next/server";
import { ensureProfileForUser } from "@/lib/profiles/ensure-profile";
import { createClient } from "@/lib/supabase/server";

/** Sync `public.profiles` from the current session (call after email/password sign-in or username change). */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await ensureProfileForUser(supabase, user);
  if (error) {
    return NextResponse.json({ error }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
