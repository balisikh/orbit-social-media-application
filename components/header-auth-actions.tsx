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
  /** Profile display name when set (same source as /me). */
  signedInDisplayName?: string | null;
};

function emailInitial(email: string): string {
  const c = email.trim()[0];
  return c ? c.toUpperCase() : "?";
}

function menuIdentityInitial(
  email: string,
  handle: string | null | undefined,
  displayName?: string | null,
): string {
  const d = displayName?.trim();
  if (d && d.length > 0) return d[0]!.toUpperCase();
  const h = handle?.trim();
  if (h && h.length > 0) return h[0]!.toUpperCase();
  return emailInitial(email);
}

type MenuIdentity = {
  primary: string;
  /** @handle on its own row when paired with display name; otherwise email, status, or null. */
  subline: string | null;
  /** Violet @handle styling when subline starts with @ */
  sublineIsHandle: boolean;
  /** Extra muted email row (only when subline is the handle). */
  emailRow: string | null;
  /** Compact “Local” pill in the menu header (dev only; not glued to @handle). */
  showLocalBadge: boolean;
  /** Second line in the collapsed nav chip (short). */
  summarySubline: string;
};

function menuIdentity(
  email: string,
  handle: string | null | undefined,
  displayName: string | null | undefined,
  sessionMode: HeaderSessionMode,
): MenuIdentity {
  const localPart = email.split("@")[0] ?? email;
  const cleanedName = displayName?.trim() || null;
  const h = handle?.trim() || null;

  const primary = cleanedName || (h ? `@${h}` : localPart);

  if (cleanedName && h) {
    return {
      primary,
      subline: `@${h}`,
      sublineIsHandle: true,
      emailRow: email,
      showLocalBadge: sessionMode === "dev",
      summarySubline: `@${h}`,
    };
  }
  if (h) {
    return {
      primary: `@${h}`,
      subline: email,
      sublineIsHandle: false,
      emailRow: null,
      showLocalBadge: sessionMode === "dev",
      summarySubline: email,
    };
  }
  if (cleanedName) {
    return {
      primary,
      subline: email,
      sublineIsHandle: false,
      emailRow: null,
      showLocalBadge: sessionMode === "dev",
      summarySubline: email,
    };
  }
  if (sessionMode === "dev") {
    return {
      primary: localPart,
      subline: null,
      sublineIsHandle: false,
      emailRow: email,
      showLocalBadge: true,
      summarySubline: email,
    };
  }
  return {
    primary: localPart,
    subline: "Signed in",
    sublineIsHandle: false,
    emailRow: email,
    showLocalBadge: false,
    summarySubline: email,
  };
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
  signedInDisplayName = null,
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

  const identity = menuIdentity(signedInEmail, signedInHandle, signedInDisplayName, sessionMode);

  return (
    <details
      ref={menuRef}
      className="relative z-50 shrink-0 [&[open]_summary_.chevron-icon]:rotate-180"
    >
      <summary
        className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-zinc-200/90 bg-white/80 py-1 pl-1 pr-2 text-left shadow-sm outline-none ring-offset-2 transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-violet-500/40 dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 [&::-webkit-details-marker]:hidden"
        aria-label={`Account menu, ${identity.primary}`}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-amber-300 text-xs font-semibold text-white"
          aria-hidden
        >
          {menuIdentityInitial(signedInEmail, signedInHandle, signedInDisplayName)}
        </span>
        <span className="hidden min-w-0 max-w-[11rem] flex-col sm:flex">
          <span className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100" title={identity.primary}>
            {identity.primary}
          </span>
          <span
            className={`truncate text-[10px] ${identity.summarySubline.startsWith("@") ? "font-medium text-violet-700 dark:text-violet-300" : "text-zinc-500 dark:text-zinc-400"}`}
            title={identity.summarySubline}
          >
            {identity.summarySubline}
          </span>
        </span>
        <ChevronDown className="chevron-icon shrink-0 text-zinc-500 transition-transform dark:text-zinc-400" />
      </summary>
      <div
        className="absolute right-0 top-[calc(100%+0.375rem)] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
        role="menu"
      >
        <div className="border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50" title={identity.primary}>
                {identity.primary}
              </p>
              {identity.subline ? (
                <p
                  className={`mt-0.5 truncate text-xs ${
                    identity.sublineIsHandle
                      ? "font-medium text-violet-700 dark:text-violet-300"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                  title={identity.subline}
                >
                  {identity.subline}
                </p>
              ) : null}
              {identity.emailRow ? (
                <p className="mt-1 truncate text-[11px] text-zinc-500 dark:text-zinc-400" title={identity.emailRow}>
                  {identity.emailRow}
                </p>
              ) : null}
            </div>
            {identity.showLocalBadge ? (
              <span
                className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-950/80 dark:text-amber-200"
                title="Signed in for local preview only"
              >
                Local
              </span>
            ) : null}
          </div>
        </div>
        <Link
          href="/me"
          role="menuitem"
          className="block px-3 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Your profile
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
