"use server";

import { apiLogin, apiSignup, apiGetMe } from "@/lib/api";
import { setAuthCookie, getAuthCookie, deleteAuthCookie } from "@/lib/auth-cookies";
import { redirect } from "next/navigation";

interface LoginResult {
  success: true;
  user: { id: string; email: string; avatarUrl?: string };
  token: string;
}

interface LoginError {
  success: false;
  error: string;
}

export async function loginAction(
  email: string,
  password: string,
  rememberMe: boolean
): Promise<LoginResult | LoginError> {
  try {
    const res = await apiLogin(email, password);
    const jwt = res.token;
    if (!jwt) {
      return { success: false, error: "No token returned from API" };
    }
    await setAuthCookie(jwt, res.sessionId, rememberMe);

    const me = await apiGetMe(jwt);;
    return {
      success: true,
      user: { id: me.userId, email: me.email, avatarUrl: me.avatarUrl },
      token: jwt,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Login failed" };
  }
}

export async function signupAction(
  name: string,
  email: string,
  password: string
): Promise<LoginResult | LoginError> {
  try {
    const signupResult = await apiSignup(name, email, password);
    if (!signupResult.userId) {
      // Assuming the signup API returns some error in the body if it fails
      // in a way that doesn't throw an exception.
      throw new Error("Signup failed to return a user ID.");
    }
    // After successful signup, log the user in
    return loginAction(email, password, false);
  } catch (err: any) {
    return { success: false, error: err?.message || "Sign up failed" };
  }
}

export async function logoutAction(): Promise<void> {
  const auth = await getAuthCookie();
  if (auth) {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    try {
      await fetch(`${API_BASE}/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ sessionId: auth.sessionId }),
      });
    } catch {
      // ignore
    }
  }
  await deleteAuthCookie();
  redirect("/");
}
