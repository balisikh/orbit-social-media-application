import { SupabaseEnvSetup } from "@/components/auth/supabase-env-setup";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { getSupabasePublicConfig } from "@/lib/env/supabase-public";

export default function UpdatePasswordPage() {
  const { ready } = getSupabasePublicConfig();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
      {!ready ? <SupabaseEnvSetup /> : <UpdatePasswordForm />}
    </div>
  );
}
