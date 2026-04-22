/** Map Supabase Auth errors to clearer copy for email + password sign-in. */
export function friendlySignInError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials") ||
    lower === "invalid email or password"
  ) {
    return "That email or password is not correct. Check spelling and caps lock, or use Reset password if you forgot your password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirm your email from the link we sent you, then try signing in again.";
  }
  if (lower.includes("too many requests")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  return message;
}
