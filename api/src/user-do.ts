import type {DurableObjectState} from "@cloudflare/workers-types";
import {Env as StorageEnv, getEntity} from "@/storage";
import {TableEntity, UserEmailEntity, UserEntity} from "@/models";
import {putEntity, queryByPk} from "@/storage";

interface Env extends StorageEnv {
}

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
                name?: string;
                email?: string;
                passwordHash?: string;
            } | null;

            if (!body?.email || !body.passwordHash) {
                return new Response(JSON.stringify({error: "email and passwordHash are required"}), {
                    status: 400,
                    headers: {"Content-Type": "application/json"},
                });
            }

            const emailLower = body.email.toLowerCase();
            const name = body.name?.trim() || "";

            // Under this DO, emailLower is part of the DO id/name, so any concurrent creates serialize here.
            // Double-check R2 index to avoid duplicates (ignore any deleted records)
            const existingIndex = await queryByPk(this.env, `USER_EMAIL#${emailLower}`);
            const activeIndex = existingIndex.find((e) => !("deletedAt" in e));
            if (activeIndex) {
                return new Response(JSON.stringify({error: "User with this email already exists"}), {
                    status: 409,
                    headers: {"Content-Type": "application/json"},
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
                name,
                userId,
                email: emailLower,
                passwordHash: body.passwordHash,
            } as UserEntity;

            const emailEntity: UserEmailEntity = {
                pk: `USER_EMAIL#${emailLower}`,
                sk: `PROFILE#${userId}`,
                entityType: "USER-EMAIL",
                createdAt: now,
                updatedAt: now,
                userId,
                email: emailLower,
                passwordHash: body.passwordHash,
            }

            // Persist main user record and email index in parallel
            await Promise.all([
                putEntity(this.env, userEntity as TableEntity),
                putEntity(this.env, emailEntity),
            ]);

            return new Response(JSON.stringify({userId, name: userEntity.name,email: userEntity.email}), {
                status: 201,
                headers: {"Content-Type": "application/json"},
            });
        }
        if (request.method === "PUT" && url.pathname === "/update") {
            const body = (await request.json().catch(() => null)) as {
                userId?: string;
                name?: string;
                email?: string;
                passwordHash?: string;
                avatarUrl?: string;
            }
            if (!body?.userId) {
                return new Response(JSON.stringify({error: "userId is required"}), {
                    status: 400,
                    headers: {"Content-Type": "application/json"},
                });
            }
            const userEntity = await getEntity(this.env, `USER#${body.userId}`, `PROFILE#${body.userId}`) as UserEntity | null;
            if (!userEntity) {
                return new Response(JSON.stringify({error: "User not found"}), {
                    status: 404,
                    headers: {"Content-Type": "application/json"},
                });
            }
            let emailLower: string | undefined;
            if (body.email) {
                emailLower = body.email.toLowerCase();
                // Check if email is changing and if new email is already taken
                if (emailLower !== userEntity.email) {
                    const existingIndex = await queryByPk(this.env, `USER_EMAIL#${emailLower}`);
                    const activeIndex = existingIndex.find((e) => !("deletedAt" in e));
                    if (activeIndex) {
                        return new Response(JSON.stringify({error: "User with this email already exists"}), {
                            status: 409,
                            headers: {"Content-Type": "application/json"},
                        });
                    }
                }
            }

            // Update fields
            if (body.name !== undefined) {
                userEntity.name = body.name;
            }
            if (emailLower !== undefined) {
                userEntity.email = emailLower;
            }
            if (body.passwordHash !== undefined) {
                userEntity.passwordHash = body.passwordHash;
            }
            if (body.avatarUrl !== undefined) {
                userEntity.avatarUrl = body.avatarUrl;
            }
            userEntity.updatedAt = new Date().toISOString();
            await putEntity(this.env, userEntity as TableEntity);
            if (emailLower !== undefined && emailLower !== userEntity.email) {
                const now = new Date().toISOString();
                const emailEntity: UserEmailEntity = {
                    pk: `USER_EMAIL#${emailLower}`,
                    sk: `PROFILE#${body.userId}`,
                    entityType: "USER-EMAIL",
                    createdAt: now,
                    updatedAt: now,
                    userId: body.userId,
                    email: emailLower,
                    passwordHash: userEntity.passwordHash,
                }
                await putEntity(this.env, emailEntity);
            }
            return new Response(JSON.stringify({userId: userEntity.userId, name: userEntity.name, email: userEntity.email}), {
                status: 200,
                headers: {"Content-Type": "application/json"},
            });
        }

        return new Response(JSON.stringify({error: "Not found"}), {
            status: 404,
            headers: {"Content-Type": "application/json"},
        });
    }
}
