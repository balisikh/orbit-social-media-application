import { MessagesPreview } from "@/components/messages/messages-preview";

export default function MessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Messages</h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          Direct conversations in a split inbox + thread layout. Explore the preview below; delivery and storage connect
          when Orbit&apos;s messaging layer is hooked to your backend.
        </p>
      </div>
      <MessagesPreview />
    </div>
  );
}
