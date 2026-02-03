import type {Env} from "@/storage";
import type {TableEntity, UserEntity, WorkspaceEntity} from "@/models";
import {putEntity, getEntity, queryByPk, deleteEntity} from "@/storage";
import {Router, type RouterType} from "itty-router";
import {getAuthFromRequest} from "@/auth";

export function usersRouter(router: RouterType) {
    // Create user and email index via UserDurableObject to avoid duplicates
    router.post("/users", async (request: any, env: Env & { USER_DO: DurableObjectNamespace }) => {
        const body = (await request.json().catch(() => null)) as Partial<UserEntity> | null;
        if (!body?.email || !body.passwordHash) {
            return new Response(JSON.stringify({error: "email and passwordHash are required"}), {status: 400});
        }
        if (body.passwordHash.length < 8) {
            return new Response(JSON.stringify({error: "password must be at least 8 characters"}), {status: 400});
        }
        const emailLower = body.email.toLowerCase();
        const id = env.USER_DO.idFromName(emailLower);
        const stub = env.USER_DO.get(id);
        const url = new URL(request.url);
        url.pathname = "/create";
        // Forward minimal payload to DO
        const res = await stub.fetch(url.toString(), {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({name: body.name, email: body.email, passwordHash: body.passwordHash}),
        });
        return res;
    });

    // Get current authenticated user
    router.get("/users/me", async (request: any, env: Env) => {
        const auth = await getAuthFromRequest(env, request);
        if (!auth?.userId) {
            return new Response(JSON.stringify({error: "Unauthorized"}), {status: 401});
        }
        const entity = await getEntity<UserEntity>(env, `USER#${auth.userId}`, `PROFILE#${auth.userId}`);
        if (!entity) {
            return new Response(JSON.stringify({error: "User not found"}), {status: 404});
        }
        return new Response(JSON.stringify({
            userId: entity.userId,
            name: entity.name,
            email: entity.email,
            avatarUrl: entity.avatarUrl
        }), {
            status: 200,
            headers: {"Content-Type": "application/json"},
        });
    });

    // Get user by id
    router.get("/users/:userId", async (request: any, env: Env) => {
        const auth = await getAuthFromRequest(env, request);
        if (!auth?.userId) {
            return new Response(JSON.stringify({error: "Unauthorized"}), {status: 401});
        }
        if (auth.userId !== request.params.userId && auth.type !== "super_master") {
            return new Response(JSON.stringify({error: "Forbidden"}), {status: 403});
        }
        const {userId} = request.params;
        const entity = await getEntity<UserEntity>(env, `USER#${userId}`, `PROFILE#${userId}`);
        if (!entity) {
            return new Response(JSON.stringify({error: "User not found"}), {status: 404});
        }
        return new Response(JSON.stringify({userId: entity.userId, email: entity.email}), {
            status: 200,
            headers: {"Content-Type": "application/json"},
        });
    });

    // Get user by email using secondary index
    router.get("/users/by-email/:email", async (request: any, env: Env) => {
        const rawEmail = request.params.email as string;
        const email = rawEmail.toLowerCase();

        const items = await queryByPk<any>(env, `USER_EMAIL#${email}`);
        const record = items[0];
        if (!record?.userId) {
            return new Response(JSON.stringify({error: "User not found"}), {status: 404});
        }

        const user = await getEntity<UserEntity>(env, `USER#${record.userId}`, `PROFILE#${record.userId}`);
        if (!user) {
            return new Response(JSON.stringify({error: "User not found"}), {status: 404});
        }

        return new Response(JSON.stringify({userId: user.userId, email: user.email}), {
            status: 200,
            headers: {"Content-Type": "application/json"},
        });
    });

    // Update user (email and/or passwordHash), keeping email index in sync
    router.put("/users/:userId", async (request: any, env: Env & {
        USER_DO: DurableObjectNamespace
    }) => {
        const {userId} = request.params;
        const auth = await getAuthFromRequest(env, request);
        if (!auth?.userId) {
            return new Response(JSON.stringify({error: "Unauthorized"}), {status: 401});
        }
        if (auth.userId !== request.params.userId && auth.type !== "super_master") {
            return new Response(JSON.stringify({error: "Forbidden"}), {status: 403});
        }
        const body = (await request.json().catch(() => null)) as Partial<UserEntity> | null;
        if (body?.passwordHash && body.passwordHash.length < 8) {
            return new Response(JSON.stringify({error: "password must be at least 8 characters"}), {status: 400});
        }
       // check if has email then validate email
        if (body?.email){
            const emailLower = body.email.toLowerCase();
            // check email is formatted correctly
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailLower)) {
                return new Response(JSON.stringify({error: "Invalid email format"}), {status: 400});
            }
        }
        const existing = await getEntity<UserEntity>(env, `USER#${userId}`, `PROFILE#${userId}`);
        if (!existing) {
            return new Response(JSON.stringify({error: "User not found"}), {status: 404});
        }
        const email = body?.email ?? existing.email;
        // handle via DO
        const id = env.USER_DO.idFromName(email.toLowerCase());
        const stub = env.USER_DO.get(id);
        const url = new URL(request.url);
        url.pathname = "/update";
        const res = await stub.fetch(url.toString(), {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                userId,
                name:body?.name,
                email: body?.email,
                passwordHash: body?.passwordHash,
                avatarUrl: body?.avatarUrl,
            }),
        });
        return res;
    });

    // Delete user and cascade delete owned workspaces by default
    router.delete("/users/:userId", async (request: any, env: Env & {
        WORKSPACE_DO: DurableObjectNamespace;
        WORKSPACE_CLEANUP_DO: DurableObjectNamespace
    }) => {
        const {userId} = request.params;
        const existing = await getEntity<UserEntity>(env, `USER#${userId}`, `PROFILE#${userId}`);
        if (!existing) {
            return new Response(JSON.stringify({error: "User not found"}), {status: 404});
        }

        // Always delete owned workspaces and enqueue cleanup
        const ownedItems = await queryByPk<WorkspaceEntity>(env, `USER#${userId}`);
        const ownedWorkspaces = ownedItems.filter((e) => e.entityType === "WORKSPACE");

        for (const ws of ownedWorkspaces) {
            const doId = env.WORKSPACE_DO.idFromName(ws.workspaceId);
            const stub = env.WORKSPACE_DO.get(doId);
            const res = await stub.fetch("https://workspace/delete", {
                method: "DELETE",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ownerUserId: userId, workspaceId: ws.workspaceId}),
            });
            if (!res.ok) {
                const msg = await res.text().catch(() => "");
                return new Response(
                    JSON.stringify({error: "Failed to delete workspace", workspaceId: ws.workspaceId, details: msg}),
                    {status: 500, headers: {"Content-Type": "application/json"}}
                );
            }

            const cleanupId = env.WORKSPACE_CLEANUP_DO.idFromName(ws.workspaceId);
            const cleanupStub = env.WORKSPACE_CLEANUP_DO.get(cleanupId);
            await cleanupStub.fetch("https://workspace/cleanup/start", {method: "POST"});
        }

        const emailLower = existing.email.toLowerCase();

        await Promise.all([
            deleteEntity(env, `USER#${userId}`, `PROFILE#${userId}`),
            deleteEntity(env, `USER_EMAIL#${emailLower}`, `PROFILE#${userId}`),
        ]);

        return new Response(JSON.stringify({ok: true}), {
            status: 200,
            headers: {"Content-Type": "application/json"},
        });
    });

    router.post("/users/:userId/avatar", async (request: any, env: Env & { DEVICE_DATA_BUCKET: R2Bucket }) => {
        const auth = await getAuthFromRequest(env as any, request as Request);
        const {userId} = request.params;

        if (!auth || (auth.type !== "user" && auth.type !== "super_master")) {
            return new Response(JSON.stringify({error: "Unauthorized"}), {
                status: 401,
                headers: {"Content-Type": "application/json"},
            });
        }
        if (auth.type === "user" && auth.userId !== userId) {
            return new Response(JSON.stringify({error: "Forbidden"}), {
                status: 403,
                headers: {"Content-Type": "application/json"},
            });
        }

        const existing = await getEntity<UserEntity>(env, `USER#${userId}`, `PROFILE#${userId}`);
        if (!existing) {
            return new Response(JSON.stringify({error: "User not found"}), {status: 404});
        }

        const contentType = (request as Request).headers.get("Content-Type") || "application/octet-stream";
        const key = `${env.TABLE_BUCKET_PREFIX}USER_AVATAR#${userId}`;

        await env.DEVICE_DATA_BUCKET.put(key, (request as Request).body, {
            httpMetadata: {contentType},
        });
        const now = new Date().toISOString();
        const avatarUrl = `/users/${userId}/avatar`;

        const updated: UserEntity = {
            ...existing,
            avatarUrl,
            updatedAt: now,
        };
        await putEntity(env, updated as TableEntity);

        return new Response(JSON.stringify({avatarUrl}), {
            status: 200,
            headers: {"Content-Type": "application/json"},
        });
    });

    router.get("/users/:userId/avatar", async (request: any, env: Env & { DEVICE_DATA_BUCKET: R2Bucket }) => {
        const {userId} = request.params;
        const key = `${env.TABLE_BUCKET_PREFIX}USER_AVATAR#${userId}`;
        const obj = await env.DEVICE_DATA_BUCKET.get(key);
        if (!obj) {
            return new Response("Not found", {status: 404});
        }
        const headers = new Headers();
        if (obj.httpMetadata?.contentType) {
            headers.set("Content-Type", obj.httpMetadata.contentType);
        }
        return new Response(obj.body, {status: 200, headers});
    });
}
