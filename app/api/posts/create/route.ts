import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PostAudience } from "@/lib/posts/types";

type Body = {
  caption?: string | null;
  imageUrl?: string | null;
  imageDataUrl?: string | null;
  audience?: unknown;
};

function cleanAudience(raw: unknown): PostAudience {
  if (raw === "followers" || raw === "public") return raw;
  return "public";
}

function cleanCaption(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 2200);
}

function cleanImageUrl(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // keep it simple: accept any non-empty URL-like string
  return trimmed.slice(0, 2000);
}

function cleanImageDataUrl(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("data:image/")) return null;
  // avoid huge payloads in DB
  if (trimmed.length > 1_500_000) return null;
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
  const image_url = cleanImageDataUrl(body.imageDataUrl) ?? cleanImageUrl(body.imageUrl);
  const audience = cleanAudience(body.audience);

  if (!caption && !image_url) {
    return NextResponse.json({ error: "Add a caption or an image." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      caption,
      image_url,
      audience,
      updated_at: new Date().toISOString(),
    })
    .select("id, user_id, caption, image_url, audience, created_at, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not create post." }, { status: 422 });
  }

  return NextResponse.json({ ok: true, post: data });
}

