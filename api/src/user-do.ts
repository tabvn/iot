import type { DurableObjectState } from '@cloudflare/workers-types';
import type { StorageEnv } from '@/db/storage';
import { put, get, queryByPk } from '@/db/storage';
import type { UserEntity, UserEmailIndexEntity } from '@/db/types';
import { Keys, EntityTypes } from '@/db/types';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse,
  conflictResponse,
} from '@/api-responses';

export class UserDurableObject {
  private state: DurableObjectState;
  private env: StorageEnv;

  constructor(state: DurableObjectState, env: StorageEnv) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/create') {
      const body = (await request.json().catch(() => null)) as {
        name?: string;
        email?: string;
        passwordHash?: string;
      } | null;

      if (!body?.email || !body.passwordHash) {
        return badRequestResponse('email and passwordHash are required');
      }

      const emailLower = body.email.toLowerCase();
      const name = body.name?.trim() || '';

      // Check if email already exists
      const { pk: emailPk, sk: emailSk } = Keys.userEmail(emailLower);
      const existingEmail = await get(this.env, emailPk, emailSk);
      if (existingEmail && !('deletedAt' in existingEmail)) {
        return conflictResponse('User with this email already exists');
      }

      const userId = crypto.randomUUID();
      const now = new Date().toISOString();

      const userEntity: UserEntity = {
        ...Keys.user(userId),
        entityType: EntityTypes.USER,
        createdAt: now,
        updatedAt: now,
        name,
        userId,
        email: emailLower,
        passwordHash: body.passwordHash,
      };

      const emailEntity: UserEmailIndexEntity = {
        ...Keys.userEmail(emailLower),
        entityType: EntityTypes.USER_EMAIL,
        createdAt: now,
        updatedAt: now,
        userId,
        email: emailLower,
        passwordHash: body.passwordHash,
      };

      // Persist main user record and email index in parallel
      await Promise.all([put(this.env, userEntity), put(this.env, emailEntity)]);

      return createdResponse({
        userId,
        name: userEntity.name,
        email: userEntity.email,
      });
    }

    if (request.method === 'PUT' && url.pathname === '/update') {
      const body = (await request.json().catch(() => null)) as {
        userId?: string;
        name?: string;
        email?: string;
        passwordHash?: string;
        avatarUrl?: string;
      } | null;

      if (!body?.userId) {
        return badRequestResponse('userId is required');
      }

      const { pk, sk } = Keys.user(body.userId);
      const userEntity = await get<UserEntity>(this.env, pk, sk);
      if (!userEntity) {
        return notFoundResponse('User not found');
      }

      let emailLower: string | undefined;
      if (body.email) {
        emailLower = body.email.toLowerCase();
        // Check if email is changing and if new email is already taken
        if (emailLower !== userEntity.email) {
          const { pk: emailPk, sk: emailSk } = Keys.userEmail(emailLower);
          const existingEmail = await get(this.env, emailPk, emailSk);
          if (existingEmail && !('deletedAt' in existingEmail)) {
            return conflictResponse('User with this email already exists');
          }
        }
      }

      // Update fields
      if (body.name !== undefined) {
        userEntity.name = body.name;
      }
      if (emailLower !== undefined && emailLower !== userEntity.email) {
        userEntity.email = emailLower;
      }
      if (body.passwordHash !== undefined) {
        userEntity.passwordHash = body.passwordHash;
      }
      if (body.avatarUrl !== undefined) {
        userEntity.avatarUrl = body.avatarUrl;
      }
      userEntity.updatedAt = new Date().toISOString();

      const promises: Promise<void>[] = [put(this.env, userEntity)];

      // If email changed, create new email index
      if (emailLower !== undefined && emailLower !== userEntity.email) {
        const emailEntity: UserEmailIndexEntity = {
          ...Keys.userEmail(emailLower),
          entityType: EntityTypes.USER_EMAIL,
          createdAt: userEntity.updatedAt,
          updatedAt: userEntity.updatedAt,
          userId: body.userId,
          email: emailLower,
          passwordHash: userEntity.passwordHash,
        };
        promises.push(put(this.env, emailEntity));
      }

      await Promise.all(promises);

      return successResponse({
        userId: userEntity.userId,
        name: userEntity.name,
        email: userEntity.email,
        avatarUrl: userEntity.avatarUrl,
      });
    }

    return notFoundResponse();
  }
}
