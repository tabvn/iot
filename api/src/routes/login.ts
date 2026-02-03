import type { Env } from "@/storage";
import type { LoginRequestBody, LoginResponseBody, SessionEntity, UserEntity, TableEntity } from "@/models";
import { queryByPk, putEntity, deleteEntity } from "@/storage";
import { getAuthFromRequest } from "@/auth";
import { Router, type RouterType } from "itty-router";

// Simple password hash verification using Web Crypto
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // For now we assume storedHash is a plain text password for demo.
  // In production, this should be a salted hash (e.g. argon2/bcrypt) and verified accordingly.
  return password === storedHash;
}

async function signUserJwt(env: Env, user: UserEntity): Promise<string | null> {
  const secret = (env as any).USER_JWT_SECRET as string | undefined;
  if (!secret) return null;

  const header = { alg: "HS256", typ: "JWT" };
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.userId,
    type: "user",
    iat: nowSeconds,
    exp: nowSeconds + 24 * 60 * 60, // 24h
  };

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  function base64UrlEncode(data: Uint8Array): string {
    const b64 = btoa(String.fromCharCode(...data));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  const headerJson = JSON.stringify(header);
  const payloadJson = JSON.stringify(payload);
  const headerB64 = base64UrlEncode(encoder.encode(headerJson));
  const payloadB64 = base64UrlEncode(encoder.encode(payloadJson));
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const signature = await crypto.subtle.sign("HMAC", key, data);
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

export function loginRouter(router: RouterType) {
  router.post("/login", async (request: Request, env: Env) => {
    const body = (await request.json().catch(() => null)) as LoginRequestBody | null;
    if (!body || !body.email || !body.password) {
      return new Response(JSON.stringify({ error: "email and password are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (body.password.length < 8) {
      // Keep error generic to avoid leaking password policy from this endpoint
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const email = body.email.toLowerCase();
    const password = body.password;

    // Lookup user by email using USER_EMAIL secondary index
    const items = await queryByPk<any>(env, `USER_EMAIL#${email}`);
    const record = items[0] as { userId?: string } | undefined;
    if (!record?.userId) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Load full user entity
    const userPk = `USER#${record.userId}`;
    const userSk = `PROFILE#${record.userId}`;
    const user = await (async () => {
      const entity = await (await import("@/storage")).getEntity<UserEntity>(env, userPk, userSk);
      return entity ?? null;
    })();

    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify password (for now, direct compare; replace with real hash check)
    const ok = await verifyPassword(password, user.passwordHash ?? "");
    if (!ok) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create a session row (optional, useful for tracking login sessions)
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const session: SessionEntity = {
      pk: `USER#${user.userId}`,
      sk: `SESSION#${sessionId}`,
      entityType: "SESSION",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      sessionId,
      userId: user.userId,
      expiresAt,
    };

    await putEntity(env, session as TableEntity);

    // Issue a JWT compatible with the auth model, if USER_JWT_SECRET is configured
    const token = await signUserJwt(env, user);

    const responseBody: LoginResponseBody & { token?: string } = {
      sessionId,
      userId: user.userId,
      ...(token ? { token } : {}),
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  router.post("/logout", async (request: Request, env: Env) => {
    const auth = await getAuthFromRequest(env as any, request);
    if (!auth || auth.type !== "user" || !auth.userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = (await request.json().catch(() => null)) as { sessionId?: string } | null;
    const pk = `USER#${auth.userId}`;

    if (body?.sessionId) {
      await deleteEntity(env, pk, `SESSION#${body.sessionId}`);
    } else {
      const items = await queryByPk<SessionEntity>(env, pk);
      await Promise.all(
        items
          .filter((e) => typeof e.sk === "string" && e.sk.startsWith("SESSION#"))
          .map((s) => deleteEntity(env, pk, s.sk!))
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}
