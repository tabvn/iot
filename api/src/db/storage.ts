/**
 * Low-level storage operations for R2 bucket
 * Provides base CRUD operations used by repositories
 */

import type { R2Bucket } from '@cloudflare/workers-types';
import type {
  AnyEntity,
  PK,
  SK,
  QueryOptions,
  QueryResult,
  BatchWriteItem,
  BatchWriteResult,
  Filter,
  FilterOperator,
} from './types';

// ============================================================================
// Storage Environment
// ============================================================================

export interface StorageEnv {
  DEVICE_DATA_BUCKET: R2Bucket;
  TABLE_BUCKET_PREFIX?: string;
}

// ============================================================================
// Internal Helpers
// ============================================================================

const encoder = new TextEncoder();

function getPrefix(env: StorageEnv): string {
  return env.TABLE_BUCKET_PREFIX || 'data/';
}

function buildKey(pk: PK, sk: SK, prefix: string): string {
  return `${prefix}${pk}/${sk}`;
}

function parseKey(key: string, prefix: string): { pk: PK; sk: SK } | null {
  if (!key.startsWith(prefix)) return null;
  const rest = key.slice(prefix.length);
  const slashIndex = rest.indexOf('/');
  if (slashIndex === -1) return null;
  return {
    pk: rest.slice(0, slashIndex),
    sk: rest.slice(slashIndex + 1),
  };
}

// ============================================================================
// Filter Evaluation
// ============================================================================

function evaluateFilter(entity: AnyEntity, filter: Filter): boolean {
  const fieldPath = filter.field.split('.');
  let value: unknown = entity;

  for (const part of fieldPath) {
    if (value === null || value === undefined || typeof value !== 'object') {
      return false;
    }
    value = (value as Record<string, unknown>)[part];
  }

  const filterValue = filter.value;

  switch (filter.operator) {
    case 'eq':
      return value === filterValue;
    case 'ne':
      return value !== filterValue;
    case 'gt':
      return typeof value === 'number' && typeof filterValue === 'number' && value > filterValue;
    case 'lt':
      return typeof value === 'number' && typeof filterValue === 'number' && value < filterValue;
    case 'gte':
      return typeof value === 'number' && typeof filterValue === 'number' && value >= filterValue;
    case 'lte':
      return typeof value === 'number' && typeof filterValue === 'number' && value <= filterValue;
    case 'contains':
      return typeof value === 'string' && typeof filterValue === 'string' && value.includes(filterValue);
    case 'startsWith':
      return typeof value === 'string' && typeof filterValue === 'string' && value.startsWith(filterValue);
    default:
      return false;
  }
}

function applyFilters(entities: AnyEntity[], filters: Filter[]): AnyEntity[] {
  if (!filters.length) return entities;
  return entities.filter(entity => filters.every(filter => evaluateFilter(entity, filter)));
}

// ============================================================================
// Core Storage Operations
// ============================================================================

/**
 * Save an entity to storage
 */
export async function put<T extends AnyEntity>(env: StorageEnv, entity: T): Promise<void> {
  const prefix = getPrefix(env);
  const key = buildKey(entity.pk, entity.sk, prefix);
  const data = JSON.stringify(entity);

  await env.DEVICE_DATA_BUCKET.put(key, encoder.encode(data), {
    httpMetadata: { contentType: 'application/json' },
  });
}

/**
 * Save multiple entities in parallel
 */
export async function putMany<T extends AnyEntity>(env: StorageEnv, entities: T[]): Promise<void> {
  await Promise.all(entities.map(entity => put(env, entity)));
}

/**
 * Get a single entity by PK and SK
 */
export async function get<T extends AnyEntity>(
  env: StorageEnv,
  pk: PK,
  sk: SK
): Promise<T | null> {
  const prefix = getPrefix(env);
  const key = buildKey(pk, sk, prefix);
  const obj = await env.DEVICE_DATA_BUCKET.get(key);

  if (!obj) return null;

  const text = await obj.text();
  return JSON.parse(text) as T;
}

/**
 * Get multiple entities by PK and SK pairs
 */
export async function getMany<T extends AnyEntity>(
  env: StorageEnv,
  keys: Array<{ pk: PK; sk: SK }>
): Promise<(T | null)[]> {
  return Promise.all(keys.map(({ pk, sk }) => get<T>(env, pk, sk)));
}

/**
 * Delete an entity by PK and SK
 */
export async function remove(env: StorageEnv, pk: PK, sk: SK): Promise<void> {
  const prefix = getPrefix(env);
  const key = buildKey(pk, sk, prefix);
  await env.DEVICE_DATA_BUCKET.delete(key);
}

/**
 * Delete multiple entities
 */
export async function removeMany(env: StorageEnv, keys: Array<{ pk: PK; sk: SK }>): Promise<void> {
  await Promise.all(keys.map(({ pk, sk }) => remove(env, pk, sk)));
}

/**
 * Soft delete an entity (sets deletedAt)
 */
export async function softDelete<T extends AnyEntity>(env: StorageEnv, pk: PK, sk: SK): Promise<T | null> {
  const entity = await get<T>(env, pk, sk);
  if (!entity) return null;

  const updated = {
    ...entity,
    updatedAt: new Date().toISOString(),
    deletedAt: new Date().toISOString(),
  };

  await put(env, updated);
  return updated;
}

/**
 * Query entities by PK (returns all items with matching PK)
 */
export async function queryByPk<T extends AnyEntity>(
  env: StorageEnv,
  pk: PK,
  options: QueryOptions = {}
): Promise<QueryResult<T>> {
  const prefix = getPrefix(env);
  const queryPrefix = `${prefix}${pk}/`;
  const results: T[] = [];
  let cursor: string | undefined = options.startAfter;
  let hasMore = false;
  const limit = options.limit ? options.limit : 1000;
  do {
    const list = await env.DEVICE_DATA_BUCKET.list({
      prefix: queryPrefix,
      cursor,
      limit: Math.min(limit + 1, 1000),
    });

    for (const obj of list.objects) {
      if (results.length >= limit) {
        hasMore = true;
        break;
      }

      const res = await env.DEVICE_DATA_BUCKET.get(obj.key);
      if (!res) continue;

      const text = await res.text();
      const entity = JSON.parse(text) as T;

      // Skip soft-deleted unless explicitly requested
      if (!options.includeDeleted && entity.deletedAt) continue;

      results.push(entity);
    }

    cursor = list.truncated && results.length < limit ? list.cursor : undefined;
  } while (cursor);

  // Sort if needed
  if (options.sortOrder === 'desc') {
    results.reverse();
  }

  return {
    items: results,
    cursor: hasMore ? results[results.length - 1]?.sk : undefined,
    hasMore,
  };
}

/**
 * Query entities by PK with SK prefix filter
 */
export async function queryByPkAndSkPrefix<T extends AnyEntity>(
  env: StorageEnv,
  pk: PK,
  skPrefix: string,
  options: QueryOptions = {}
): Promise<QueryResult<T>> {
  const prefix = getPrefix(env);
  const queryPrefix = `${prefix}${pk}/${skPrefix}`;
  const results: T[] = [];
  let cursor: string | undefined = options.startAfter;
  let hasMore = false;
  const limit = options.limit || 1000;

  do {
    const list = await env.DEVICE_DATA_BUCKET.list({
      prefix: queryPrefix,
      cursor,
      limit: Math.min(limit + 1, 1000),
    });

    for (const obj of list.objects) {
      if (results.length >= limit) {
        hasMore = true;
        break;
      }

      const res = await env.DEVICE_DATA_BUCKET.get(obj.key);
      if (!res) continue;

      const text = await res.text();
      const entity = JSON.parse(text) as T;

      if (!options.includeDeleted && entity.deletedAt) continue;

      results.push(entity);
    }

    cursor = list.truncated && results.length < limit ? list.cursor : undefined;
  } while (cursor);

  if (options.sortOrder === 'desc') {
    results.reverse();
  }

  return {
    items: results,
    cursor: hasMore ? results[results.length - 1]?.sk : undefined,
    hasMore,
  };
}

/**
 * Query entities by PK with SK range (between startSk and endSk)
 */
export async function queryByPkAndSkRange<T extends AnyEntity>(
  env: StorageEnv,
  pk: PK,
  startSk: SK,
  endSk: SK,
  options: QueryOptions = {}
): Promise<QueryResult<T>> {
  const prefix = getPrefix(env);
  const queryPrefix = `${prefix}${pk}/`;
  const results: T[] = [];
  let cursor: string | undefined = options.startAfter;
  let hasMore = false;
  const limit = options.limit || 1000;

  do {
    const list = await env.DEVICE_DATA_BUCKET.list({
      prefix: queryPrefix,
      cursor,
      limit: 1000, // Fetch in batches
    });

    for (const obj of list.objects) {
      if (results.length >= limit) {
        hasMore = true;
        break;
      }

      const parsed = parseKey(obj.key, prefix);
      if (!parsed) continue;

      // Check SK range
      if (parsed.sk < startSk || parsed.sk > endSk) continue;

      const res = await env.DEVICE_DATA_BUCKET.get(obj.key);
      if (!res) continue;

      const text = await res.text();
      const entity = JSON.parse(text) as T;

      if (!options.includeDeleted && entity.deletedAt) continue;

      results.push(entity);
    }

    cursor = list.truncated && results.length < limit ? list.cursor : undefined;
  } while (cursor);

  if (options.sortOrder === 'desc') {
    results.reverse();
  }

  return {
    items: results,
    cursor: hasMore ? results[results.length - 1]?.sk : undefined,
    hasMore,
  };
}

/**
 * Query with filters (applied in-memory after fetch)
 */
export async function queryWithFilters<T extends AnyEntity>(
  env: StorageEnv,
  pk: PK,
  filters: Filter[],
  options: QueryOptions = {}
): Promise<QueryResult<T>> {
  const result = await queryByPk<T>(env, pk, { ...options, limit: options.limit ? Math.min(options.limit * 2, 999) : undefined });
  const filtered = applyFilters(result.items, filters) as T[];

  const limit = options.limit || filtered.length;
  const items = filtered.slice(0, limit);

  return {
    items,
    cursor: items.length < filtered.length ? items[items.length - 1]?.sk : undefined,
    hasMore: items.length < filtered.length,
  };
}

/**
 * Count entities by PK
 */
export async function countByPk(env: StorageEnv, pk: PK): Promise<number> {
  const prefix = getPrefix(env);
  const queryPrefix = `${prefix}${pk}/`;
  let count = 0;
  let cursor: string | undefined;

  do {
    const list = await env.DEVICE_DATA_BUCKET.list({ prefix: queryPrefix, cursor });
    count += list.objects.length;
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);

  return count;
}

/**
 * Check if an entity exists
 */
export async function exists(env: StorageEnv, pk: PK, sk: SK): Promise<boolean> {
  const prefix = getPrefix(env);
  const key = buildKey(pk, sk, prefix);
  const obj = await env.DEVICE_DATA_BUCKET.head(key);
  return obj !== null;
}

/**
 * Batch write (put and delete) operations
 */
export async function batchWrite(env: StorageEnv, items: BatchWriteItem[]): Promise<BatchWriteResult> {
  const failedItems: BatchWriteItem[] = [];

  await Promise.all(
    items.map(async (item) => {
      try {
        if (item.type === 'put' && item.entity) {
          await put(env, item.entity);
        } else if (item.type === 'delete' && item.pk && item.sk) {
          await remove(env, item.pk, item.sk);
        }
      } catch (error) {
        failedItems.push(item);
      }
    })
  );

  return {
    success: failedItems.length === 0,
    failedItems: failedItems.length > 0 ? failedItems : undefined,
  };
}

/**
 * Update specific fields of an entity (merge update)
 */
export async function update<T extends AnyEntity>(
  env: StorageEnv,
  pk: PK,
  sk: SK,
  updates: Partial<T>
): Promise<T | null> {
  const entity = await get<T>(env, pk, sk);
  if (!entity) return null;

  const updated = {
    ...entity,
    ...updates,
    pk: entity.pk, // Ensure PK/SK cannot be changed
    sk: entity.sk,
    updatedAt: new Date().toISOString(),
  };

  await put(env, updated);
  return updated;
}

/**
 * Upsert - create or update an entity
 */
export async function upsert<T extends AnyEntity>(
  env: StorageEnv,
  entity: T,
  mergeIfExists: boolean = true
): Promise<T> {
  if (mergeIfExists) {
    const existing = await get<T>(env, entity.pk, entity.sk);
    if (existing) {
      const merged = {
        ...existing,
        ...entity,
        createdAt: existing.createdAt, // Preserve original creation time
        updatedAt: new Date().toISOString(),
      };
      await put(env, merged);
      return merged;
    }
  }

  await put(env, entity);
  return entity;
}

/**
 * Scan all entities with a global prefix (use sparingly!)
 */
export async function scan<T extends AnyEntity>(
  env: StorageEnv,
  globalPrefix: string,
  options: QueryOptions = {}
): Promise<QueryResult<T>> {
  const prefix = getPrefix(env);
  const queryPrefix = `${prefix}${globalPrefix}`;
  const results: T[] = [];
  let cursor: string | undefined = options.startAfter;
  let hasMore = false;
  const limit = options.limit || 1000;

  do {
    const list = await env.DEVICE_DATA_BUCKET.list({
      prefix: queryPrefix,
      cursor,
      limit: Math.min(limit + 1, 1000),
    });

    for (const obj of list.objects) {
      if (results.length >= limit) {
        hasMore = true;
        break;
      }

      const res = await env.DEVICE_DATA_BUCKET.get(obj.key);
      if (!res) continue;

      const text = await res.text();
      const entity = JSON.parse(text) as T;

      if (!options.includeDeleted && entity.deletedAt) continue;

      results.push(entity);
    }

    cursor = list.truncated && results.length < limit ? list.cursor : undefined;
  } while (cursor);

  return {
    items: results,
    cursor: hasMore ? results[results.length - 1]?.sk : undefined,
    hasMore,
  };
}

// ============================================================================
// Transaction-like Operations
// ============================================================================

export interface TransactionContext {
  operations: BatchWriteItem[];
}

export function createTransaction(): TransactionContext {
  return { operations: [] };
}

export function transactionPut<T extends AnyEntity>(ctx: TransactionContext, entity: T): void {
  ctx.operations.push({ type: 'put', entity });
}

export function transactionDelete(ctx: TransactionContext, pk: PK, sk: SK): void {
  ctx.operations.push({ type: 'delete', pk, sk });
}

export async function commitTransaction(env: StorageEnv, ctx: TransactionContext): Promise<BatchWriteResult> {
  return batchWrite(env, ctx.operations);
}

