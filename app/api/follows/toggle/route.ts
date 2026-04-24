import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = { followedId?: string };

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const followedId = typeof body.followedId === "string" ? body.followedId.trim() : "";
  if (!followedId) return NextResponse.json({ error: "followedId required" }, { status: 400 });
  if (followedId === user.id) return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

  const { data: targetProfile, error: profErr } = await supabase
    .from("profiles")
    .select("require_follow_approval")
    .eq("id", followedId)
    .maybeSingle();

  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 422 });
  const requireApproval = Boolean(targetProfile?.require_follow_approval);

  const { data: existingFollow } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("followed_id", followedId)
    .maybeSingle();

  if (existingFollow) {
    const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("followed_id", followedId);
    if (error) return NextResponse.json({ error: error.message }, { status: 422 });
    return NextResponse.json({ ok: true, following: false, requested: false });
  }

  const { data: pending } = await supabase
    .from("follow_requests")
    .select("id")
    .eq("follower_id", user.id)
    .eq("followed_id", followedId)
    .eq("status", "pending")
    .maybeSingle();

  if (requireApproval) {
    if (pending) {
      const { error } = await supabase.from("follow_requests").delete().eq("id", pending.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 422 });
      return NextResponse.json({ ok: true, following: false, requested: false });
    }

    const { error } = await supabase
      .from("follow_requests")
      .insert({ follower_id: user.id, followed_id: followedId, status: "pending" });
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, following: false, requested: true });
      }
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    return NextResponse.json({ ok: true, following: false, requested: true });
  }

  if (pending) {
    await supabase.from("follow_requests").delete().eq("id", pending.id);
  }

  const { error } = await supabase.from("follows").insert({ follower_id: user.id, followed_id: followedId });
  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json({ ok: true, following: true, requested: false });
}
