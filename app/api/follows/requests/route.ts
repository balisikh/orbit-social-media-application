import { NextResponse } from "next/server";
import { listPendingIncomingFollowRequests } from "@/lib/follows/queries";
import { createClient } from "@/lib/supabase/server";

/** Pending follow requests addressed to the signed-in user (newest first). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await listPendingIncomingFollowRequests(supabase, user.id);
  return NextResponse.json({ requests });
}
