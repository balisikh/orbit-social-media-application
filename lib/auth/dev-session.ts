import { cookies } from "next/headers";

export const ORBIT_DEV_SESSION_COOKIE = "orbit_dev_session";

export type OrbitDevSessionPayload = {
  email: string;
  username: string | null;
};

export function encodeDevSessionPayload(payload: OrbitDevSessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeDevSessionPayload(raw: string): OrbitDevSessionPayload | null {
  try {
    const text = Buffer.from(raw, "base64url").toString("utf8");
    const data = JSON.parse(text) as unknown;
    if (!data || typeof data !== "object") return null;
    const email = (data as { email?: unknown }).email;
    const username = (data as { username?: unknown }).username;
    if (typeof email !== "string" || !email) return null;
    return {
      email,
      username: typeof username === "string" && username.length > 0 ? username : null,
    };
  } catch {
    return null;
  }
}

export async function readDevSessionFromCookies(): Promise<OrbitDevSessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(ORBIT_DEV_SESSION_COOKIE)?.value;
  if (!raw) return null;
  return decodeDevSessionPayload(raw);
}

export function isDevSessionAllowed(): boolean {
  return process.env.NODE_ENV === "development";
}
