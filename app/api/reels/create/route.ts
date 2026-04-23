import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  caption?: string | null;
  videoDataUrl?: string | null;
};

function cleanCaption(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 2200);
}

function cleanVideoDataUrl(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("data:video/")) return null;
  // avoid huge payloads in DB
  if (trimmed.length > 2_000_000) return null;
  return trimmed;
}

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

  const caption = cleanCaption(body.caption);
  const video_url = cleanVideoDataUrl(body.videoDataUrl);
  if (!video_url) {
    return NextResponse.json({ error: "Video required (must be small enough)." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("reels")
    .insert({
      user_id: user.id,
      caption,
      video_url,
      updated_at: new Date().toISOString(),
    })
    .select("id, user_id, caption, video_url, created_at, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not create reel." }, { status: 422 });
  }

  return NextResponse.json({ ok: true, reel: data });
}

