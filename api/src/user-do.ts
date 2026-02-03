import type { DurableObjectState } from "@cloudflare/workers-types";
import type { Env as StorageEnv } from "@/storage";
import type { TableEntity, UserEntity } from "@/models";
import { putEntity, queryByPk } from "@/storage";

interface Env extends StorageEnv {}

export class UserDurableObject {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/create") {
      const body = (await request.json().catch(() => null)) as {
        email?: string;
        passwordHash?: string;
      } | null;

      if (!body?.email || !body.passwordHash) {
        return new Response(JSON.stringify({ error: "email and passwordHash are required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const emailLower = body.email.toLowerCase();

      // Under this DO, emailLower is part of the DO id/name, so any concurrent creates serialize here.
      // Double-check R2 index to avoid duplicates (ignore any deleted records)
      const existingIndex = await queryByPk(this.env, `USER_EMAIL#${emailLower}`);
      const activeIndex = existingIndex.find((e) => !("deletedAt" in e));
      if (activeIndex) {
        return new Response(JSON.stringify({ error: "User with this email already exists" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }

      const userId = crypto.randomUUID();
      const now = new Date().toISOString();

      const userEntity: UserEntity = {
        pk: `USER#${userId}`,
        sk: `PROFILE#${userId}`,
        entityType: "USER",
        createdAt: now,
        updatedAt: now,
        userId,
        email: body.email,
        passwordHash: body.passwordHash,
      } as UserEntity;

      const emailEntity = {
        pk: `USER_EMAIL#${emailLower}`,
        sk: `PROFILE#${userId}`,
        entityType: "USER" as const,
        createdAt: now,
        updatedAt: now,
        userId,
        email: emailLower,
        passwordHash: body.passwordHash,
      } satisfies TableEntity;

      // Persist main user record and email index in parallel
      await Promise.all([
        putEntity(this.env, userEntity as TableEntity),
        putEntity(this.env, emailEntity),
      ]);

      return new Response(JSON.stringify({ userId, email: userEntity.email }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}
