import { getAuthCookie } from "./auth-cookies";
import { apiGetMe } from "./api";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Session {
  user: SessionUser;
  token: string;
}

export async function getSession(): Promise<Session | null> {
  const auth = await getAuthCookie();
  if (!auth) return null;
  try {
    const me = await apiGetMe(auth.token);
    console.log("DEBUG",me);
    return {
      user: { id: me.userId, name: me?.name || "" , email: me.email, avatarUrl: me.avatarUrl },
      token: auth.token,
    };
  } catch {
    return null;
  }
}
