import { OrbitHeader } from "@/components/orbit-header";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <OrbitHeader />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</div>
    </>
  );
}
