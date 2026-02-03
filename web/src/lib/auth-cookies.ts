import { cookies } from "next/headers";

const COOKIE_NAME = "thebaycity_auth";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

interface AuthCookiePayload {
  token: string;
  sessionId: string;
}

export async function setAuthCookie(
  token: string,
  sessionId: string,
  rememberMe: boolean
) {
  const cookieStore = await cookies();
  const value = JSON.stringify({ token, sessionId } satisfies AuthCookiePayload);

  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(rememberMe ? { maxAge: THIRTY_DAYS } : {}),
  });
}

export async function getAuthCookie(): Promise<AuthCookiePayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthCookiePayload;
    if (!parsed.token || !parsed.sessionId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function deleteAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
