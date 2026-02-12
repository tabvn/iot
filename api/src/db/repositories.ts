/**
 * Repository pattern implementations for all entities
 * Provides type-safe CRUD operations for each model
 */

import type { StorageEnv } from './storage';
import {
  get,
  put,
  putMany,
  remove,
  removeMany,
  softDelete,
  update,
  queryByPk,
  queryByPkAndSkPrefix,
  queryByPkAndSkRange,
  exists,
  batchWrite,
  createTransaction,
  transactionPut,
  transactionDelete,
  commitTransaction,
} from './storage';
import {
  Keys,
  Timestamps,
  generateUUID,
  EntityTypes,
  type QueryOptions,
  type QueryResult,
  type UUID,
  type ISOTimestamp,
  type UserEntity,
  type UserEmailIndexEntity,
  type WorkspaceEntity,
  type WorkspaceMemberEntity,
  type WorkspacePlanEntity,
  type WorkspaceBillingEntity,
  type WorkspacePlan,
  type MemberRole,
  type DevicePermission,
  type DeviceEntity,
  type DeviceDataEntity,
  type DeviceStatus,
  type DeviceFieldMapping,
  type SessionEntity,
  type AutomationEntity,
  type AutomationStatus,
  type AutomationTriggerConfig,
  type AutomationActionConfig,
  type AutomationConditionGroup,
  type WorkspaceApiKeyEntity,
  type DeviceApiKeyEntity,
  type SuperMasterKeyEntity,
  type ApiKeyHashIndexEntity,
  type WorkspaceInvitationEntity,
  type InvitationEmailIndexEntity,
  type InvitationTokenIndexEntity,
  type InvitationStatus,
  type AutomationLogEntity,
  type AutomationLogIndexEntity,
  type AutomationStatsEntity,
  type AutomationLogStatus,
  type ActionExecutionResult,
  type UserNotificationEntity,
  type UserNotificationPreferencesEntity,
  type NotificationType,
  type NotificationSeverity,
} from './types';

// ============================================================================
// Base Repository
// ============================================================================

export abstract class BaseRepository<T> {
  constructor(protected env: StorageEnv) {}

  protected now(): ISOTimestamp {
    return Timestamps.now();
  }

  protected uuid(): UUID {
    return generateUUID();
  }
}

// ============================================================================
// User Repository
// ============================================================================

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  passwordHash?: string;
  avatarUrl?: string;
}

export class UserRepository extends BaseRepository<UserEntity> {
  /**
   * Get user by ID
   */
  async getById(userId: UUID): Promise<UserEntity | null> {
    const { pk, sk } = Keys.user(userId);
    return get<UserEntity>(this.env, pk, sk);
  }

  /**
   * Get user by email
   */
  async getByEmail(email: string): Promise<UserEntity | null> {
    const { pk, sk } = Keys.userEmail(email);
    const emailIndex = await get<UserEmailIndexEntity>(this.env, pk, sk);
    if (!emailIndex) return null;
    return this.getById(emailIndex.userId);
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const { pk, sk } = Keys.userEmail(email);
    return exists(this.env, pk, sk);
  }

  /**
   * Create a new user with email index
   */
  async create(input: CreateUserInput): Promise<UserEntity> {
    const userId = this.uuid();
    const now = this.now();
    const emailLower = input.email.toLowerCase();

    const user: UserEntity = {
      ...Keys.user(userId),
      entityType: EntityTypes.USER,
      createdAt: now,
      updatedAt: now,
      userId,
      name: input.name,
      email: emailLower,
      passwordHash: input.passwordHash,
      avatarUrl: input.avatarUrl,
    };

    const emailIndex: UserEmailIndexEntity = {
      ...Keys.userEmail(emailLower),
      entityType: EntityTypes.USER_EMAIL,
      createdAt: now,
      updatedAt: now,
      userId,
      email: emailLower,
      passwordHash: input.passwordHash,
    };

    await putMany(this.env, [user, emailIndex]);
    return user;
  }

  /**
   * Update user by ID
   */
  async update(userId: UUID, input: UpdateUserInput): Promise<UserEntity | null> {
    const user = await this.getById(userId);
    if (!user) return null;

    const now = this.now();
    const updates: Partial<UserEntity> = { ...input, updatedAt: now };

    // If email is changing, update email index
    if (input.email && input.email.toLowerCase() !== user.email) {
      const newEmailLower = input.email.toLowerCase();

      // Check if new email exists
      if (await this.emailExists(newEmailLower)) {
        throw new Error('Email already exists');
      }

      // Delete old email index, create new one
      const oldEmailKey = Keys.userEmail(user.email);
      const newEmailIndex: UserEmailIndexEntity = {
        ...Keys.userEmail(newEmailLower),
        entityType: EntityTypes.USER_EMAIL,
        createdAt: now,
        updatedAt: now,
        userId,
        email: newEmailLower,
        passwordHash: input.passwordHash || user.passwordHash,
      };

      const tx = createTransaction();
      transactionDelete(tx, oldEmailKey.pk, oldEmailKey.sk);
      transactionPut(tx, newEmailIndex);
      await commitTransaction(this.env, tx);

      updates.email = newEmailLower;
    }

    const { pk, sk } = Keys.user(userId);
    return update<UserEntity>(this.env, pk, sk, updates);
  }

  /**
   * Delete user and related data
   */
  async delete(userId: UUID): Promise<boolean> {
    const user = await this.getById(userId);
    if (!user) return false;

    const { pk, sk } = Keys.user(userId);
    const emailKey = Keys.userEmail(user.email);

    await removeMany(this.env, [
      { pk, sk },
      { pk: emailKey.pk, sk: emailKey.sk },
    ]);

    return true;
  }

  /**
   * Verify password
   */
  async verifyPassword(email: string, passwordHash: string): Promise<UserEntity | null> {
    const { pk, sk } = Keys.userEmail(email);
    const emailIndex = await get<UserEmailIndexEntity>(this.env, pk, sk);

    if (!emailIndex || emailIndex.passwordHash !== passwordHash) {
      return null;
    }

    return this.getById(emailIndex.userId);
  }
}

// ============================================================================
// Workspace Repository
// ============================================================================

export interface CreateWorkspaceInput {
  ownerUserId: UUID;
  name: string;
  slug: string;
  description?: string;
  plan?: WorkspacePlan;
}

export interface UpdateWorkspaceInput {
  name?: string;
  slug?: string;
  description?: string;
}

export class WorkspaceRepository extends BaseRepository<WorkspaceEntity> {
  /**
   * Get workspace by ID
   */
  async getById(workspaceId: UUID): Promise<WorkspaceEntity | null> {
    const { pk, sk } = Keys.workspace(workspaceId);
    return get<WorkspaceEntity>(this.env, pk, sk);
  }

  /**
   * Get workspace by slug/alias
   */
  async getBySlug(slug: string): Promise<WorkspaceEntity | null> {
    const { pk, sk } = Keys.workspaceAlias(slug);
    return get<WorkspaceEntity>(this.env, pk, sk);
  }

  /**
   * Check if slug exists
   */
  async slugExists(slug: string): Promise<boolean> {
    const { pk, sk } = Keys.workspaceAlias(slug);
    return exists(this.env, pk, sk);
  }

  /**
   * Create a new workspace with owner as member
   */
  async create(input: CreateWorkspaceInput): Promise<WorkspaceEntity> {
    const workspaceId = this.uuid();
    const now = this.now();
    const slugLower = input.slug.toLowerCase();

    if (await this.slugExists(slugLower)) {
      throw new Error('Workspace slug already exists');
    }

    const workspace: WorkspaceEntity = {
      ...Keys.workspace(workspaceId),
      entityType: EntityTypes.WORKSPACE,
      createdAt: now,
      updatedAt: now,
      workspaceId,
      ownerUserId: input.ownerUserId,
      name: input.name,
      slug: slugLower,
      description: input.description,
      plan: input.plan || 'starter',
    };

    const aliasEntity: WorkspaceEntity = {
      ...Keys.workspaceAlias(slugLower),
      entityType: EntityTypes.WORKSPACE,
      createdAt: now,
      updatedAt: now,
      workspaceId,
      ownerUserId: input.ownerUserId,
      name: input.name,
      slug: slugLower,
      description: input.description,
    };

    const ownerMember: WorkspaceMemberEntity = {
      ...Keys.workspaceMember(workspaceId, input.ownerUserId),
      entityType: EntityTypes.WORKSPACE,
      createdAt: now,
      updatedAt: now,
      workspaceId,
      userId: input.ownerUserId,
      role: 'owner',
      devicePermissions: {},
    };

    const userWorkspaceIndex: WorkspaceMemberEntity = {
      ...Keys.userWorkspace(input.ownerUserId, workspaceId),
      entityType: EntityTypes.WORKSPACE,
      createdAt: now,
      updatedAt: now,
      workspaceId,
      userId: input.ownerUserId,
      role: 'owner',
      devicePermissions: {},
    };

    const globalIndex: WorkspaceEntity = {
      pk: 'WORKSPACES#ALL',
      sk: `WS#${workspaceId}`,
      entityType: EntityTypes.WORKSPACE,
      createdAt: now,
      updatedAt: now,
      workspaceId,
      ownerUserId: input.ownerUserId,
      name: input.name,
      slug: slugLower,
      description: input.description,
    };

    await putMany(this.env, [workspace, aliasEntity, ownerMember, userWorkspaceIndex, globalIndex]);
    return workspace;
  }

  /**
   * Update workspace
   */
  async update(workspaceId: UUID, input: UpdateWorkspaceInput): Promise<WorkspaceEntity | null> {
    const workspace = await this.getById(workspaceId);
    if (!workspace) return null;

    const now = this.now();
    const updates: Partial<WorkspaceEntity> = { ...input, updatedAt: now };

    // If slug is changing, update alias
    if (input.slug && input.slug.toLowerCase() !== workspace.slug) {
      const newSlug = input.slug.toLowerCase();

      if (await this.slugExists(newSlug)) {
        throw new Error('Workspace slug already exists');
      }

      // Create new alias, mark old as deleted
      const oldAliasKey = Keys.workspaceAlias(workspace.slug);
      const newAlias: WorkspaceEntity = {
        ...Keys.workspaceAlias(newSlug),
        entityType: EntityTypes.WORKSPACE,
        createdAt: now,
        updatedAt: now,
        workspaceId,
        ownerUserId: workspace.ownerUserId,
        name: input.name || workspace.name,
        slug: newSlug,
        description: input.description || workspace.description,
      };

      await remove(this.env, oldAliasKey.pk, oldAliasKey.sk);
      await put(this.env, newAlias);

      updates.slug = newSlug;
    }

    const { pk, sk } = Keys.workspace(workspaceId);
    return update<WorkspaceEntity>(this.env, pk, sk, updates);
  }

  /**
   * Get all workspaces for a user
   */
  async getByUserId(userId: UUID): Promise<WorkspaceEntity[]> {
    const result = await queryByPkAndSkPrefix<WorkspaceMemberEntity>(
      this.env,
      `USER#${userId}`,
      'WS#'
    );


    const workspaces = await Promise.all(
      result.items.map(member => this.getById(member.workspaceId))
    );

    return workspaces.filter((ws): ws is WorkspaceEntity => ws !== null);
  }

  /**
   * Delete workspace and all related data
   */
  async delete(workspaceId: UUID): Promise<boolean> {
    const workspace = await this.getById(workspaceId);
    if (!workspace) return false;

    // Get all workspace items to delete
    const items = await queryByPk(this.env, `WS#${workspaceId}`);
    const keysToDelete = items.items.map(item => ({ pk: item.pk, sk: item.sk }));

    // Delete alias
    const aliasKey = Keys.workspaceAlias(workspace.slug);
    keysToDelete.push({ pk: aliasKey.pk, sk: aliasKey.sk });

    // Delete from global index
    keysToDelete.push({ pk: 'WORKSPACES#ALL', sk: `WS#${workspaceId}` });

    await removeMany(this.env, keysToDelete);
    return true;
  }
}

// ============================================================================
// Workspace Member Repository
// ============================================================================

export interface AddMemberInput {
  workspaceId: UUID;
  userId: UUID;
  role: MemberRole;
  devicePermissions?: Record<string, DevicePermission[]>;
}

export class WorkspaceMemberRepository extends BaseRepository<WorkspaceMemberEntity> {
  /**
   * Get member by workspace and user
   */
  async get(workspaceId: UUID, userId: UUID): Promise<WorkspaceMemberEntity | null> {
    const { pk, sk } = Keys.workspaceMember(workspaceId, userId);
    return get<WorkspaceMemberEntity>(this.env, pk, sk);
  }

  /**
   * Check if user is member of workspace
   */
  async isMember(workspaceId: UUID, userId: UUID): Promise<boolean> {
    const { pk, sk } = Keys.workspaceMember(workspaceId, userId);
    return exists(this.env, pk, sk);
  }

  /**
   * Add member to workspace
   */
  async add(input: AddMemberInput): Promise<WorkspaceMemberEntity> {
    const now = this.now();

    const member: WorkspaceMemberEntity = {
      ...Keys.workspaceMember(input.workspaceId, input.userId),
      entityType: EntityTypes.WORKSPACE,
      createdAt: now,
      updatedAt: now,
      workspaceId: input.workspaceId,
      userId: input.userId,
      role: input.role,
      devicePermissions: input.devicePermissions || {},
    };

    const userIndex: WorkspaceMemberEntity = {
      ...Keys.userWorkspace(input.userId, input.workspaceId),
      entityType: EntityTypes.WORKSPACE,
      createdAt: now,
      updatedAt: now,
      workspaceId: input.workspaceId,
      userId: input.userId,
      role: input.role,
      devicePermissions: input.devicePermissions || {},
    };

    await putMany(this.env, [member, userIndex]);
    return member;
  }

  /**
   * Update member role and permissions
   */
  async update(
    workspaceId: UUID,
    userId: UUID,
    updates: { role?: MemberRole; devicePermissions?: Record<string, DevicePermission[]> }
  ): Promise<WorkspaceMemberEntity | null> {
    const { pk, sk } = Keys.workspaceMember(workspaceId, userId);
    const member = await update<WorkspaceMemberEntity>(this.env, pk, sk, {
      ...updates,
      updatedAt: this.now(),
    });

    if (member) {
      // Update user index too
      const userIndexKey = Keys.userWorkspace(userId, workspaceId);
      await update<WorkspaceMemberEntity>(this.env, userIndexKey.pk, userIndexKey.sk, {
        ...updates,
        updatedAt: this.now(),
      });
    }

    return member;
  }

  /**
   * Remove member from workspace
   */
  async remove(workspaceId: UUID, userId: UUID): Promise<boolean> {
    const memberKey = Keys.workspaceMember(workspaceId, userId);
    const userIndexKey = Keys.userWorkspace(userId, workspaceId);

    await removeMany(this.env, [
      { pk: memberKey.pk, sk: memberKey.sk },
      { pk: userIndexKey.pk, sk: userIndexKey.sk },
    ]);

    return true;
  }

  /**
   * Get all members of a workspace
   */
  async getAllByWorkspace(workspaceId: UUID): Promise<WorkspaceMemberEntity[]> {
    const result = await queryByPkAndSkPrefix<WorkspaceMemberEntity>(
      this.env,
      `WS#${workspaceId}`,
      'MEMBER#'
    );
    return result.items;
  }

  /**
   * Get all workspaces for a user
   */
  async getAllByUser(userId: UUID): Promise<WorkspaceMemberEntity[]> {
    const result = await queryByPkAndSkPrefix<WorkspaceMemberEntity>(
      this.env,
      `USER#${userId}`,
      'WS#'
    );
    return result.items;
  }
}

// ============================================================================
// Device Repository
// ============================================================================

export interface CreateDeviceInput {
  workspaceId: UUID;
  name: string;
  type: string;
  description?: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  location?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  fieldMappings?: DeviceFieldMapping[];
}

export interface UpdateDeviceInput {
  name?: string;
  type?: string;
  status?: DeviceStatus;
  description?: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  location?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  fieldMappings?: DeviceFieldMapping[];
  lastSeenAt?: ISOTimestamp;
  lastData?: Record<string, unknown>;
}

export class DeviceRepository extends BaseRepository<DeviceEntity> {
  /**
   * Get device by ID
   */
  async getById(workspaceId: UUID, deviceId: UUID): Promise<DeviceEntity | null> {
    const { pk, sk } = Keys.device(workspaceId, deviceId);
    return get<DeviceEntity>(this.env, pk, sk);
  }

  /**
   * Create a new device
   */
  async create(input: CreateDeviceInput): Promise<DeviceEntity> {
    const deviceId = this.uuid();
    const now = this.now();

    const device: DeviceEntity = {
      ...Keys.device(input.workspaceId, deviceId),
      entityType: EntityTypes.DEVICE,
      createdAt: now,
      updatedAt: now,
      deviceId,
      workspaceId: input.workspaceId,
      name: input.name,
      type: input.type,
      status: 'offline',
      description: input.description,
      manufacturer: input.manufacturer,
      model: input.model,
      firmwareVersion: input.firmwareVersion,
      location: input.location,
      tags: input.tags,
      metadata: input.metadata,
      fieldMappings: input.fieldMappings,
    };

    await put(this.env, device);
    return device;
  }

  /**
   * Update device
   */
  async update(workspaceId: UUID, deviceId: UUID, input: UpdateDeviceInput): Promise<DeviceEntity | null> {
    const { pk, sk } = Keys.device(workspaceId, deviceId);
    return update<DeviceEntity>(this.env, pk, sk, { ...input, updatedAt: this.now() });
  }

  /**
   * Update device status
   */
  async updateStatus(workspaceId: UUID, deviceId: UUID, status: DeviceStatus): Promise<DeviceEntity | null> {
    return this.update(workspaceId, deviceId, {
      status,
      lastSeenAt: status === 'online' ? this.now() : undefined
    });
  }

  /**
   * Update device last data
   */
  async updateLastData(
    workspaceId: UUID,
    deviceId: UUID,
    data: Record<string, unknown>
  ): Promise<DeviceEntity | null> {
    return this.update(workspaceId, deviceId, {
      lastData: data,
      lastSeenAt: this.now(),
      status: 'online',
    });
  }

  /**
   * Delete device
   */
  async delete(workspaceId: UUID, deviceId: UUID): Promise<boolean> {
    const { pk, sk } = Keys.device(workspaceId, deviceId);
    await remove(this.env, pk, sk);
    return true;
  }

  /**
   * Get all devices in a workspace
   */
  async getAllByWorkspace(workspaceId: UUID, options?: QueryOptions): Promise<QueryResult<DeviceEntity>> {
    return queryByPkAndSkPrefix<DeviceEntity>(this.env, `WS#${workspaceId}`, 'DEVICE#', options);
  }

  /**
   * Get devices by status
   */
  async getByStatus(workspaceId: UUID, status: DeviceStatus): Promise<DeviceEntity[]> {
    const result = await this.getAllByWorkspace(workspaceId);
    return result.items.filter(device => device.status === status);
  }
}

// ============================================================================
// Device Data Repository
// ============================================================================

export interface SaveDeviceDataInput {
  deviceId: UUID;
  workspaceId: UUID;
  data: Record<string, unknown>;
  ttlDays?: number;
}

export class DeviceDataRepository extends BaseRepository<DeviceDataEntity> {
  /**
   * Save device data point
   */
  async save(input: SaveDeviceDataInput): Promise<DeviceDataEntity> {
    const timestamp = this.now();
    const { pk, sk } = Keys.deviceData(input.deviceId, timestamp);

    const dataEntity: DeviceDataEntity = {
      pk,
      sk,
      entityType: EntityTypes.DEVICE_DATA,
      createdAt: timestamp,
      updatedAt: timestamp,
      deviceId: input.deviceId,
      workspaceId: input.workspaceId,
      timestamp,
      data: input.data,
      ttl: input.ttlDays ? Timestamps.addDays(timestamp, input.ttlDays) : undefined,
    };

    await put(this.env, dataEntity);
    return dataEntity;
  }

  /**
   * Get device data by time range
   */
  async getByTimeRange(
    deviceId: UUID,
    startTime: ISOTimestamp,
    endTime: ISOTimestamp,
    options?: QueryOptions
  ): Promise<QueryResult<DeviceDataEntity>> {
    return queryByPkAndSkRange<DeviceDataEntity>(
      this.env,
      `DEV_DATA#${deviceId}`,
      `TS#${startTime}`,
      `TS#${endTime}`,
      options
    );
  }

  /**
   * Get latest device data
   */
  async getLatest(deviceId: UUID, limit: number = 100): Promise<DeviceDataEntity[]> {
    const result = await queryByPkAndSkPrefix<DeviceDataEntity>(
      this.env,
      `DEV_DATA#${deviceId}`,
      'TS#',
      { limit, sortOrder: 'desc' }
    );
    return result.items;
  }

  /**
   * Delete old data beyond retention
   */
  async deleteOlderThan(deviceId: UUID, beforeTime: ISOTimestamp): Promise<number> {
    const result = await queryByPkAndSkRange<DeviceDataEntity>(
      this.env,
      `DEV_DATA#${deviceId}`,
      'TS#0000-00-00T00:00:00.000Z',
      `TS#${beforeTime}`
    );

    const keysToDelete = result.items.map(item => ({ pk: item.pk, sk: item.sk }));
    await removeMany(this.env, keysToDelete);

    return keysToDelete.length;
  }
}

// ============================================================================
// Session Repository
// ============================================================================

export class SessionRepository extends BaseRepository<SessionEntity> {
  /**
   * Create a new session
   */
  async create(userId: UUID, expiresInHours: number = 24): Promise<SessionEntity> {
    const sessionId = this.uuid();
    const now = this.now();

    const session: SessionEntity = {
      ...Keys.session(userId, sessionId),
      entityType: EntityTypes.SESSION,
      createdAt: now,
      updatedAt: now,
      sessionId,
      userId,
      expiresAt: Timestamps.addHours(now, expiresInHours),
    };

    await put(this.env, session);
    return session;
  }

  /**
   * Get session
   */
  async get(userId: UUID, sessionId: UUID): Promise<SessionEntity | null> {
    const { pk, sk } = Keys.session(userId, sessionId);
    const session = await get<SessionEntity>(this.env, pk, sk);

    if (!session) return null;
    if (Timestamps.isExpired(session.expiresAt)) {
      await this.delete(userId, sessionId);
      return null;
    }

    return session;
  }

  /**
   * Delete session
   */
  async delete(userId: UUID, sessionId: UUID): Promise<void> {
    const { pk, sk } = Keys.session(userId, sessionId);
    await remove(this.env, pk, sk);
  }

  /**
   * Delete all sessions for a user
   */
  async deleteAllForUser(userId: UUID): Promise<void> {
    const result = await queryByPkAndSkPrefix<SessionEntity>(
      this.env,
      `USER#${userId}`,
      'SESSION#'
    );

    const keysToDelete = result.items.map(item => ({ pk: item.pk, sk: item.sk }));
    await removeMany(this.env, keysToDelete);
  }
}

// ============================================================================
// Invitation Repository
// ============================================================================

export interface CreateInvitationInput {
  workspaceId: UUID;
  workspaceName: string;
  workspaceSlug: string;
  email: string;
  role: MemberRole;
  devicePermissions?: Record<string, DevicePermission[]>;
  invitedByUserId: UUID;
  invitedByName?: string;
  expiresInDays?: number;
}

export class InvitationRepository extends BaseRepository<WorkspaceInvitationEntity> {
  /**
   * Generate invitation token
   */
  private generateToken(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create invitation
   */
  async create(input: CreateInvitationInput): Promise<WorkspaceInvitationEntity> {
    const invitationId = this.uuid();
    const token = this.generateToken();
    const now = this.now();

    const invitation: WorkspaceInvitationEntity = {
      ...Keys.invitation(input.workspaceId, invitationId),
      entityType: EntityTypes.INVITATION,
      createdAt: now,
      updatedAt: now,
      invitationId,
      workspaceId: input.workspaceId,
      workspaceName: input.workspaceName,
      workspaceSlug: input.workspaceSlug,
      email: input.email.toLowerCase(),
      role: input.role,
      devicePermissions: input.devicePermissions,
      invitedByUserId: input.invitedByUserId,
      invitedByName: input.invitedByName,
      status: 'pending',
      token,
      expiresAt: Timestamps.addDays(now, input.expiresInDays || 7),
    };

    const emailIndex: InvitationEmailIndexEntity = {
      ...Keys.invitationByEmail(input.email, invitationId),
      entityType: EntityTypes.INVITATION,
      createdAt: now,
      updatedAt: now,
      invitationId,
      workspaceId: input.workspaceId,
      email: input.email.toLowerCase(),
      status: 'pending',
    };

    const tokenIndex: InvitationTokenIndexEntity = {
      ...Keys.invitationByToken(token),
      entityType: EntityTypes.INVITATION,
      createdAt: now,
      updatedAt: now,
      invitationId,
      workspaceId: input.workspaceId,
      token,
    };

    await putMany(this.env, [invitation, emailIndex, tokenIndex]);
    return invitation;
  }

  /**
   * Get invitation by ID
   */
  async getById(workspaceId: UUID, invitationId: UUID): Promise<WorkspaceInvitationEntity | null> {
    const { pk, sk } = Keys.invitation(workspaceId, invitationId);
    return get<WorkspaceInvitationEntity>(this.env, pk, sk);
  }

  /**
   * Get invitation by token
   */
  async getByToken(token: string): Promise<WorkspaceInvitationEntity | null> {
    const { pk, sk } = Keys.invitationByToken(token);
    const tokenIndex = await get<InvitationTokenIndexEntity>(this.env, pk, sk);
    if (!tokenIndex) return null;
    return this.getById(tokenIndex.workspaceId, tokenIndex.invitationId);
  }

  /**
   * Update invitation status
   */
  async updateStatus(
    workspaceId: UUID,
    invitationId: UUID,
    status: InvitationStatus,
    acceptedByUserId?: UUID
  ): Promise<WorkspaceInvitationEntity | null> {
    const { pk, sk } = Keys.invitation(workspaceId, invitationId);
    const updates: Partial<WorkspaceInvitationEntity> = {
      status,
      updatedAt: this.now(),
    };

    if (status === 'accepted' && acceptedByUserId) {
      updates.acceptedAt = this.now();
      updates.acceptedByUserId = acceptedByUserId;
    }

    return update<WorkspaceInvitationEntity>(this.env, pk, sk, updates);
  }

  /**
   * Get all invitations for a workspace
   */
  async getAllByWorkspace(workspaceId: UUID): Promise<WorkspaceInvitationEntity[]> {
    const result = await queryByPkAndSkPrefix<WorkspaceInvitationEntity>(
      this.env,
      `WS#${workspaceId}`,
      'INVITE#'
    );
    return result.items;
  }

  /**
   * Get pending invitations for email
   */
  async getPendingByEmail(email: string): Promise<WorkspaceInvitationEntity[]> {
    const result = await queryByPkAndSkPrefix<InvitationEmailIndexEntity>(
      this.env,
      'INVITE_EMAIL_IDX',
      `EMAIL#${email.toLowerCase()}`
    );

    const invitations = await Promise.all(
      result.items
        .filter(idx => idx.status === 'pending')
        .map(idx => this.getById(idx.workspaceId, idx.invitationId))
    );

    return invitations.filter((inv): inv is WorkspaceInvitationEntity => inv !== null);
  }

  /**
   * Delete invitation and all its indexes
   */
  async delete(workspaceId: UUID, invitationId: UUID): Promise<boolean> {
    const invitation = await this.getById(workspaceId, invitationId);
    if (!invitation) return false;

    const keysToDelete = [
      Keys.invitation(workspaceId, invitationId),
      Keys.invitationByEmail(invitation.email, invitationId),
      Keys.invitationByToken(invitation.token),
    ];

    await removeMany(this.env, keysToDelete);
    return true;
  }
}

// ============================================================================
// Automation Repository
// ============================================================================

export interface CreateAutomationInput {
  workspaceId: UUID;
  name: string;
  description?: string;
  triggerType: AutomationEntity['triggerType'];
  triggerConfig: AutomationTriggerConfig;
  conditionGroups?: AutomationConditionGroup[];
  conditionLogic?: 'AND' | 'OR';
  actions: AutomationActionConfig[];
}

export class AutomationRepository extends BaseRepository<AutomationEntity> {
  /**
   * Get automation by ID
   */
  async getById(workspaceId: UUID, automationId: UUID): Promise<AutomationEntity | null> {
    const { pk, sk } = Keys.automation(workspaceId, automationId);
    return get<AutomationEntity>(this.env, pk, sk);
  }

  /**
   * Create automation
   */
  async create(input: CreateAutomationInput): Promise<AutomationEntity> {
    const automationId = this.uuid();
    const now = this.now();

    const automation: AutomationEntity = {
      ...Keys.automation(input.workspaceId, automationId),
      entityType: EntityTypes.AUTOMATION,
      createdAt: now,
      updatedAt: now,
      workspaceId: input.workspaceId,
      automationId,
      name: input.name,
      description: input.description,
      status: 'active',
      triggerType: input.triggerType,
      triggerConfig: input.triggerConfig,
      conditionGroups: input.conditionGroups,
      conditionLogic: input.conditionLogic,
      actions: input.actions,
      executionCount: 0,
    };

    await put(this.env, automation);
    return automation;
  }

  /**
   * Update automation
   */
  async update(
    workspaceId: UUID,
    automationId: UUID,
    updates: Partial<Omit<AutomationEntity, 'pk' | 'sk' | 'entityType' | 'workspaceId' | 'automationId' | 'createdAt'>>
  ): Promise<AutomationEntity | null> {
    const { pk, sk } = Keys.automation(workspaceId, automationId);
    return update<AutomationEntity>(this.env, pk, sk, { ...updates, updatedAt: this.now() });
  }

  /**
   * Update status
   */
  async updateStatus(workspaceId: UUID, automationId: UUID, status: AutomationStatus): Promise<AutomationEntity | null> {
    return this.update(workspaceId, automationId, { status });
  }

  /**
   * Increment execution count
   */
  async incrementExecutionCount(workspaceId: UUID, automationId: UUID): Promise<void> {
    const automation = await this.getById(workspaceId, automationId);
    if (!automation) return;

    await this.update(workspaceId, automationId, {
      executionCount: (automation.executionCount || 0) + 1,
      lastTriggeredAt: this.now(),
    });
  }

  /**
   * Delete automation
   */
  async delete(workspaceId: UUID, automationId: UUID): Promise<boolean> {
    const { pk, sk } = Keys.automation(workspaceId, automationId);
    await remove(this.env, pk, sk);
    return true;
  }

  /**
   * Get all automations in workspace
   */
  async getAllByWorkspace(workspaceId: UUID, options?: QueryOptions): Promise<QueryResult<AutomationEntity>> {
    return queryByPkAndSkPrefix<AutomationEntity>(this.env, `WS#${workspaceId}`, 'AUTO#', options);
  }

  /**
   * Get active automations
   */
  async getActiveByWorkspace(workspaceId: UUID): Promise<AutomationEntity[]> {
    const result = await this.getAllByWorkspace(workspaceId);
    return result.items.filter(a => a.status === 'active');
  }

  /**
   * Get automations by trigger type
   */
  async getByTriggerType(workspaceId: UUID, triggerType: AutomationEntity['triggerType']): Promise<AutomationEntity[]> {
    const result = await this.getAllByWorkspace(workspaceId);
    return result.items.filter(a => a.triggerType === triggerType && a.status === 'active');
  }
}

// ============================================================================
// API Key Repository
// ============================================================================

export class ApiKeyRepository extends BaseRepository<WorkspaceApiKeyEntity> {
  /**
   * Generate API key
   */
  private generateKey(prefix: string): { key: string; hash: string; keyPrefix: string } {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const rawKey = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const fullKey = `${prefix}_${rawKey}`;

    return {
      key: fullKey,
      hash: fullKey, // In production, use proper hash
      keyPrefix: fullKey.slice(0, 12),
    };
  }

  /**
   * Create workspace API key
   */
  async createWorkspaceKey(workspaceId: UUID, name: string): Promise<{ entity: WorkspaceApiKeyEntity; key: string }> {
    const apiKeyId = this.uuid();
    const now = this.now();
    const { key, hash, keyPrefix } = this.generateKey('wsk');

    const entity: WorkspaceApiKeyEntity = {
      ...Keys.workspaceApiKey(workspaceId, apiKeyId),
      entityType: EntityTypes.API_KEY,
      createdAt: now,
      updatedAt: now,
      apiKeyId,
      workspaceId,
      name,
      keyHash: hash,
      keyPrefix,
    };

    const hashIndex: ApiKeyHashIndexEntity = {
      ...Keys.apiKeyHashIndex(hash),
      entityType: EntityTypes.API_KEY,
      createdAt: now,
      updatedAt: now,
      keyType: 'workspace',
      workspaceId,
      keyId: apiKeyId,
    };

    await putMany(this.env, [entity, hashIndex]);
    return { entity, key };
  }

  /**
   * Get key by hash (for validation)
   */
  async getByHash(keyHash: string): Promise<ApiKeyHashIndexEntity | null> {
    const { pk, sk } = Keys.apiKeyHashIndex(keyHash);
    return get<ApiKeyHashIndexEntity>(this.env, pk, sk);
  }

  /**
   * Revoke API key
   */
  async revoke(workspaceId: UUID, apiKeyId: UUID): Promise<boolean> {
    const { pk, sk } = Keys.workspaceApiKey(workspaceId, apiKeyId);
    const key = await get<WorkspaceApiKeyEntity>(this.env, pk, sk);
    if (!key) return false;

    const now = this.now();
    await update<WorkspaceApiKeyEntity>(this.env, pk, sk, { revokedAt: now, updatedAt: now });

    // Update hash index
    const hashIndexKey = Keys.apiKeyHashIndex(key.keyHash);
    await update<ApiKeyHashIndexEntity>(this.env, hashIndexKey.pk, hashIndexKey.sk, { revokedAt: now, updatedAt: now });

    return true;
  }

  /**
   * Get all keys for workspace
   */
  async getAllByWorkspace(workspaceId: UUID): Promise<WorkspaceApiKeyEntity[]> {
    const result = await queryByPkAndSkPrefix<WorkspaceApiKeyEntity>(
      this.env,
      `WS#${workspaceId}`,
      'API_KEY#'
    );
    return result.items;
  }
}

// ============================================================================
// Notification Repository
// ============================================================================

export interface CreateNotificationInput {
  workspaceId: UUID;
  userId: UUID;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  expiresInDays?: number;
}

export class NotificationRepository extends BaseRepository<UserNotificationEntity> {
  /**
   * Create notification
   */
  async create(input: CreateNotificationInput): Promise<UserNotificationEntity> {
    const notificationId = this.uuid();
    const now = this.now();

    const notification: UserNotificationEntity = {
      ...Keys.userNotification(input.userId, input.workspaceId, now, notificationId),
      entityType: EntityTypes.NOTIFICATION,
      createdAt: now,
      updatedAt: now,
      notificationId,
      workspaceId: input.workspaceId,
      userId: input.userId,
      type: input.type,
      severity: input.severity,
      title: input.title,
      message: input.message,
      metadata: input.metadata,
      read: false,
      expiresAt: input.expiresInDays ? Timestamps.addDays(now, input.expiresInDays) : undefined,
    };

    await put(this.env, notification);
    return notification;
  }

  /**
   * Mark as read
   */
  async markAsRead(userId: UUID, workspaceId: UUID, notificationId: UUID, timestamp: ISOTimestamp): Promise<void> {
    const { pk, sk } = Keys.userNotification(userId, workspaceId, timestamp, notificationId);
    await update<UserNotificationEntity>(this.env, pk, sk, {
      read: true,
      readAt: this.now(),
      updatedAt: this.now(),
    });
  }

  /**
   * Get unread notifications
   */
  async getUnread(userId: UUID, workspaceId: UUID, limit?: number): Promise<UserNotificationEntity[]> {
    const result = await queryByPk<UserNotificationEntity>(
      this.env,
      `USER_NOTIF#${userId}#${workspaceId}`,
      { limit, sortOrder: 'desc' }
    );
    return result.items.filter(n => !n.read);
  }

  /**
   * Get all notifications
   */
  async getAll(userId: UUID, workspaceId: UUID, options?: QueryOptions): Promise<QueryResult<UserNotificationEntity>> {
    return queryByPk<UserNotificationEntity>(
      this.env,
      `USER_NOTIF#${userId}#${workspaceId}`,
      options
    );
  }
}

// ============================================================================
// Repository Factory
// ============================================================================

export interface Repositories {
  users: UserRepository;
  workspaces: WorkspaceRepository;
  members: WorkspaceMemberRepository;
  devices: DeviceRepository;
  deviceData: DeviceDataRepository;
  sessions: SessionRepository;
  invitations: InvitationRepository;
  automations: AutomationRepository;
  apiKeys: ApiKeyRepository;
  notifications: NotificationRepository;
}

export function createRepositories(env: StorageEnv): Repositories {
  return {
    users: new UserRepository(env),
    workspaces: new WorkspaceRepository(env),
    members: new WorkspaceMemberRepository(env),
    devices: new DeviceRepository(env),
    deviceData: new DeviceDataRepository(env),
    sessions: new SessionRepository(env),
    invitations: new InvitationRepository(env),
    automations: new AutomationRepository(env),
    apiKeys: new ApiKeyRepository(env),
    notifications: new NotificationRepository(env),
  };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get a repository instance
 */
export function getRepository<K extends keyof Repositories>(
  env: StorageEnv,
  name: K
): Repositories[K] {
  return createRepositories(env)[name];
}

