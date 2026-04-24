"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  initialRequireApproval: boolean;
};

export function RequireFollowApprovalField({ initialRequireApproval }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialRequireApproval);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    setValue(initialRequireApproval);
  }, [initialRequireApproval]);

  async function persist(next: boolean) {
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requireFollowApproval: next }),
      });
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(j?.error ?? "Couldn’t update setting.");
        setValue(!next);
        return;
      }
      setOk(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Follow requests</p>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500 dark:border-zinc-600"
          checked={value}
          disabled={saving}
          onChange={(e) => {
            const next = e.target.checked;
            setValue(next);
            void persist(next);
          }}
        />
        <span className="text-sm text-zinc-700 dark:text-zinc-300">
          Require my approval before someone can follow me
          <span className="mt-1 block text-xs font-normal text-zinc-500 dark:text-zinc-400">
            New followers get a pending request instead of appearing in your follower list until you accept.
          </span>
        </span>
      </label>
      {saving ? <p className="text-xs text-zinc-500 dark:text-zinc-400">Saving…</p> : null}
      {ok && !saving ? <p className="text-xs text-emerald-600 dark:text-emerald-400">Saved.</p> : null}
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
