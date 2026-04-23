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

  const { data: existing } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("followed_id", followedId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("followed_id", followedId);
    if (error) return NextResponse.json({ error: error.message }, { status: 422 });
    return NextResponse.json({ ok: true, following: false });
  }

  const { error } = await supabase.from("follows").insert({ follower_id: user.id, followed_id: followedId });
  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json({ ok: true, following: true });
}

