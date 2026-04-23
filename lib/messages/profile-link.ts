/**
 * Opens Messages with a thread for this account (see `MessagesPreview` + `?handle=` / `?name=`).
 * `accountKey` is a follower viewer key (often an email) or a following handle like `me_follow_001`.
 */
export function messagesThreadHrefForProfileAccount(accountKey: string): string {
  const raw = accountKey.trim();
  const handleParam = raw.replace(/^@/, "").toLowerCase().slice(0, 120);
  const name = raw.includes("@")
    ? (raw.split("@")[0] ?? raw).slice(0, 60)
    : `@${raw.replace(/^@/, "").slice(0, 58)}`;
  return `/messages?handle=${encodeURIComponent(handleParam)}&name=${encodeURIComponent(name)}`;
}
