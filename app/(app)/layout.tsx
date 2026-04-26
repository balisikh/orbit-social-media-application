import { OrbitHeader } from "@/components/orbit-header";
import { getHeaderSession } from "@/lib/auth/header-session";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { email, mode, handle, displayName } = await getHeaderSession();

  return (
    <>
      <OrbitHeader
        signedInEmail={email}
        sessionMode={mode}
        signedInHandle={handle}
        signedInDisplayName={displayName}
      />
      <div className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">{children}</div>
    </>
  );
}
