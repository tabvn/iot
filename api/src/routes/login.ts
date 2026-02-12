import { createRepositories } from '@/db';
import type { StorageEnv } from '@/db/storage';
import type { UserEntity } from '@/db/types';
import { getAuthFromRequest } from '@/auth';
import type { RouterType } from 'itty-router';
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
} from '@/api-responses';

// Simple password hash verification using Web Crypto
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // For now we assume storedHash is a plain text password for demo.
  // In production, this should be a salted hash (e.g. argon2/bcrypt) and verified accordingly.
  return password === storedHash;
}

interface JwtEnv extends StorageEnv {
  USER_JWT_SECRET?: string;
}

async function signUserJwt(env: JwtEnv, user: UserEntity): Promise<string | null> {
  const secret = env.USER_JWT_SECRET;
  if (!secret) return null;

  const header = { alg: 'HS256', typ: 'JWT' };
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.userId,
    type: 'user',
    iat: nowSeconds,
    exp: nowSeconds + 24 * 60 * 60, // 24h
  };

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  function base64UrlEncode(data: Uint8Array): string {
    const b64 = btoa(String.fromCharCode(...data));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  const headerJson = JSON.stringify(header);
  const payloadJson = JSON.stringify(payload);
  const headerB64 = base64UrlEncode(encoder.encode(headerJson));
  const payloadB64 = base64UrlEncode(encoder.encode(payloadJson));
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

export function loginRouter(router: RouterType) {
  router.post('/login', async (request: Request, env: JwtEnv) => {
    const body = (await request.json().catch(() => null)) as {
      email?: string;
      password?: string;
    } | null;

    if (!body?.email || !body?.password) {
      return badRequestResponse('email and password are required');
    }

    if (body.password.length < 8) {
      return unauthorizedResponse('Invalid credentials');
    }

    const email = body.email.toLowerCase();
    const password = body.password;

    const db = createRepositories(env);

    // Get user by email
    const user = await db.users.getByEmail(email);
    if (!user) {
      return unauthorizedResponse('Invalid credentials');
    }

    // Verify password
    const ok = await verifyPassword(password, user.passwordHash ?? '');
    if (!ok) {
      return unauthorizedResponse('Invalid credentials');
    }

    // Create session
    const session = await db.sessions.create(user.userId, 24); // 24 hours

    // Issue JWT
    const token = await signUserJwt(env, user);

    return successResponse({
      sessionId: session.sessionId,
      userId: user.userId,
      ...(token ? { token } : {}),
    });
  });

  router.post('/logout', async (request: Request, env: JwtEnv) => {
    const auth = await getAuthFromRequest(env, request);
    if (!auth || auth.type !== 'user' || !auth.userId) {
      return unauthorizedResponse();
    }

    const body = (await request.json().catch(() => null)) as { sessionId?: string } | null;
    const db = createRepositories(env);

    if (body?.sessionId) {
      await db.sessions.delete(auth.userId, body.sessionId);
    } else {
      await db.sessions.deleteAllForUser(auth.userId);
    }

    return successResponse({ ok: true });
  });
}
