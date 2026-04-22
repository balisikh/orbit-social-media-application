"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutDevButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await fetch("/api/orbit-dev-session", { method: "DELETE" });
      router.push("/auth/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={signOut}
      className="mt-3 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      {pending ? "Signing out…" : "Sign out (local preview)"}
    </button>
  );
}
