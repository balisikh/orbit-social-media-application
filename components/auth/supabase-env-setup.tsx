import {
  describeSupabaseEnvGap,
  getSupabasePublicConfig,
} from "@/lib/env/supabase-public";

type SupabaseEnvSetupProps = {
  /** Match the page you are on so the disabled preview matches the real form. */
  variant?: "login" | "signup";
};

export function SupabaseEnvSetup({ variant = "login" }: SupabaseEnvSetupProps) {
  const { url, anonKey, ready } = getSupabasePublicConfig();
  if (ready) return null;

  const hint = describeSupabaseEnvGap(url, anonKey);

  const disabledInputClass =
    "mt-1 w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500";

  return (
    <div className="w-full space-y-4 text-left">
      <div>
        <label
          htmlFor="orbit-setup-email"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Email
        </label>
        <input
          id="orbit-setup-email"
          type="email"
          disabled
          readOnly
          placeholder="you@example.com"
          className={disabledInputClass}
        />
      </div>

      {variant === "signup" ? (
        <div>
          <label
            htmlFor="orbit-setup-user"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Username
          </label>
          <input
            id="orbit-setup-user"
            type="text"
            disabled
            readOnly
            placeholder="your_handle"
            className={disabledInputClass}
          />
        </div>
      ) : null}

      <div>
        <label
          htmlFor="orbit-setup-password"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Password
        </label>
        <input
          id="orbit-setup-password"
          type="password"
          disabled
          readOnly
          placeholder="••••••••"
          className={disabledInputClass}
        />
      </div>

      {variant === "signup" ? (
        <div>
          <label
            htmlFor="orbit-setup-confirm"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Confirm password
          </label>
          <input
            id="orbit-setup-confirm"
            type="password"
            disabled
            readOnly
            placeholder="••••••••"
            className={disabledInputClass}
          />
        </div>
      ) : null}

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">{hint}</p>
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-100 py-3 text-sm font-semibold text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
      >
        {variant === "signup" ? "Create account" : "Submit"}
      </button>
      {variant === "login" ? (
        <p className="text-right text-sm text-zinc-400 dark:text-zinc-500">Reset password — available after setup</p>
      ) : null}
      <a
        href="https://supabase.com/dashboard"
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Open Supabase Dashboard
      </a>
      <p className="text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        If you are setting up this project: copy the project URL and public (anon) API key from
        Supabase into your private local env file, restart the dev server, then reload this page.
      </p>
    </div>
  );
}
