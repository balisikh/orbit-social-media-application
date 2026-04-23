import Link from "next/link";
import { CreatePostForm } from "@/components/posts/create-post-form";
import { readDevSessionFromCookies } from "@/lib/auth/dev-session";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";
import { createClient } from "@/lib/supabase/server";

export default async function NewPostPage() {
  const configured = getSupabasePublicConfig().ready;

  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return (
        <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">New post</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You need to sign in to post.{" "}
            <Link href="/auth/login" className="font-medium text-violet-600 underline dark:text-violet-400">
              Sign in
            </Link>
            .
          </p>
        </div>
      );
    }
    return <CreatePostForm ownerKey={user.id} onCreatedHref="/me" />;
  }

  const dev = await readDevSessionFromCookies();
  if (!dev?.email) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">New post</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          You need to sign in to post.{" "}
          <Link href="/auth/login" className="font-medium text-violet-600 underline dark:text-violet-400">
            Sign in
          </Link>
          .
        </p>
      </div>
    );
  }

  return <CreatePostForm ownerKey={dev.email} onCreatedHref="/me" />;
}

