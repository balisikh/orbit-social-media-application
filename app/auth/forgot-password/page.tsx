import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { SupabaseEnvSetup } from "@/components/auth/supabase-env-setup";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";

export default function ForgotPasswordPage() {
  const { ready } = getSupabasePublicConfig();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
      {!ready ? <SupabaseEnvSetup /> : <ForgotPasswordForm />}
    </div>
  );
}
