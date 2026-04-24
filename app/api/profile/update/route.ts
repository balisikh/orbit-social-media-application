import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  bio?: string | null;
  requireFollowApproval?: boolean;
};

function cleanBio(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 280);
}

/** Update `public.profiles` for the current session (bio, etc.). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const hasBio = "bio" in body;
  const hasReq =
    "requireFollowApproval" in body && typeof (body as Body).requireFollowApproval === "boolean";

  if (!hasBio && !hasReq) {
    return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  }

  const patch: { bio?: string | null; require_follow_approval?: boolean; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (hasBio) patch.bio = cleanBio(body.bio);
  if (hasReq) patch.require_follow_approval = body.requireFollowApproval;

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  return NextResponse.json({
    ok: true,
    ...(hasBio ? { bio: patch.bio ?? null } : {}),
    ...(hasReq ? { requireFollowApproval: patch.require_follow_approval } : {}),
  });
}

