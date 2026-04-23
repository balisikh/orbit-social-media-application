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
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</div>
    </>
  );
}
