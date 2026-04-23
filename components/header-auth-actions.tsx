"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { HeaderSessionMode } from "@/lib/auth/header-session";

type HeaderAuthActionsProps = {
  signedInEmail: string | null;
  sessionMode: HeaderSessionMode;
  /** Signup username / profile handle when known (from session + profile row). */
  signedInHandle?: string | null;
};

function emailInitial(email: string): string {
  const c = email.trim()[0];
  return c ? c.toUpperCase() : "?";
}

function menuIdentityInitial(email: string, handle: string | null | undefined): string {
  const h = handle?.trim();
  if (h && h.length > 0) return h[0]!.toUpperCase();
  return emailInitial(email);
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeaderAuthActions({
  signedInEmail,
  sessionMode,
  signedInHandle = null,
}: HeaderAuthActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    menuRef.current?.removeAttribute("open");
  }, [pathname]);

  async function signOut() {
    setSigningOut(true);
    try {
      if (sessionMode === "dev") {
        await fetch("/api/orbit-dev-session", { method: "DELETE" });
      } else if (sessionMode === "supabase") {
        const supabase = createClient();
        await supabase.auth.signOut();
      }
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  if (!signedInEmail || !sessionMode) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/auth/login"
          className="rounded-full px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Log in
        </Link>
        <Link
          href="/auth/signup"
          className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Sign up
        </Link>
      </div>
    );
  }

  const localPart = signedInEmail.split("@")[0] ?? signedInEmail;

  return (
    <details
      ref={menuRef}
      className="relative z-50 shrink-0 [&[open]_summary_.chevron-icon]:rotate-180"
    >
      <summary
        className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-zinc-200/90 bg-white/80 py-1 pl-1 pr-2 text-left shadow-sm outline-none ring-offset-2 transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-violet-500/40 dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 [&::-webkit-details-marker]:hidden"
        aria-label={signedInHandle ? `Account menu, @${signedInHandle}` : "Account menu"}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-amber-300 text-xs font-semibold text-white"
          aria-hidden
        >
          {menuIdentityInitial(signedInEmail, signedInHandle)}
        </span>
        <span className="hidden min-w-0 max-w-[10rem] flex-col sm:flex">
          <span
            className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100"
            title={signedInHandle ? `@${signedInHandle}` : signedInEmail}
          >
            {signedInHandle ? `@${signedInHandle}` : localPart}
          </span>
          <span className="truncate text-[10px] text-zinc-500 dark:text-zinc-400" title={signedInEmail}>
            {signedInHandle
              ? signedInEmail
              : sessionMode === "dev"
                ? "Local"
                : "Signed in"}
          </span>
        </span>
        <ChevronDown className="chevron-icon shrink-0 text-zinc-500 transition-transform dark:text-zinc-400" />
      </summary>
      <div
        className="absolute right-0 top-[calc(100%+0.375rem)] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
        role="menu"
      >
        <div className="border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
          {signedInHandle ? (
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50" title={`@${signedInHandle}`}>
              @{signedInHandle}
            </p>
          ) : null}
          <p
            className={`truncate text-sm text-zinc-900 dark:text-zinc-50 ${signedInHandle ? "mt-0.5 text-xs font-normal text-zinc-500 dark:text-zinc-400" : "font-medium"}`}
            title={signedInEmail}
          >
            {signedInEmail}
          </p>
          {sessionMode === "dev" ? (
            <div className="mt-2 max-h-[min(50vh,18rem)] space-y-2 overflow-y-auto text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              <p>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">Local preview.</span> Orbit is running
                without cloud sign-in: your session stays in a dev cookie on <em>this</em> device so you can explore the
                app. Nothing is saved to a remote Orbit server yet.
              </p>
              <details className="rounded-lg border border-zinc-200/90 bg-zinc-50/90 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900/60">
                <summary className="cursor-pointer list-none text-xs font-medium text-violet-700 dark:text-violet-300 [&::-webkit-details-marker]:hidden">
                  Hosting checklist — save accounts & profiles in the cloud
                </summary>
                <div className="mt-2 border-t border-zinc-200/80 pt-2 dark:border-zinc-700/80">
                  <p className="mb-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                    This build pairs Orbit with a Supabase project for auth and the <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-800">profiles</code> table. Follow the steps below when you are ready.
                  </p>
                  <ol className="list-decimal space-y-1.5 pl-4 marker:font-medium marker:text-zinc-500 dark:marker:text-zinc-400">
                    <li>
                      In the{" "}
                      <a
                        href="https://supabase.com/dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-violet-600 underline underline-offset-2 dark:text-violet-400"
                      >
                        Supabase dashboard
                      </a>
                      , create a project, then open <strong className="font-medium text-zinc-800 dark:text-zinc-200">Project Settings → API</strong>.
                    </li>
                    <li>
                      Copy the <strong className="font-medium text-zinc-800 dark:text-zinc-200">Project URL</strong> and{" "}
                      <strong className="font-medium text-zinc-800 dark:text-zinc-200">anon public</strong> key into{" "}
                      <code className="rounded bg-zinc-100 px-1 font-mono text-[11px] text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">.env.local</code>{" "}
                      as:
                      <code className="mt-1 block rounded-lg bg-zinc-100 px-2 py-1.5 font-mono text-[11px] text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                        NEXT_PUBLIC_SUPABASE_URL=…
                        <br />
                        NEXT_PUBLIC_SUPABASE_ANON_KEY=…
                      </code>
                    </li>
                    <li>
                      Restart <code className="rounded bg-zinc-100 px-1 font-mono text-[11px] dark:bg-zinc-900">npm run dev</code> so Orbit picks up the new values.
                    </li>
                    <li>
                      In the Supabase SQL editor, run{" "}
                      <code className="rounded bg-zinc-100 px-1 font-mono text-[11px] dark:bg-zinc-900">supabase/migrations/20260422120000_orbit_profiles.sql</code>{" "}
                      from this repository once.
                    </li>
                  </ol>
                </div>
              </details>
            </div>
          ) : null}
        </div>
        <Link
          href="/me"
          role="menuitem"
          className="block px-3 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          {signedInHandle ? `@${signedInHandle}` : "Profile"}
        </Link>
        <button
          type="button"
          role="menuitem"
          disabled={signingOut}
          onClick={() => {
            void signOut();
          }}
          className="w-full px-3 py-2.5 text-left text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </details>
  );
}
