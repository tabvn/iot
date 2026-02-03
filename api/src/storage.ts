import type { R2Bucket } from "@cloudflare/workers-types";
import type { TableEntity, PK, SK } from "@/models";

export interface Env {
  DEVICE_DATA_BUCKET: R2Bucket;
  TABLE_BUCKET_PREFIX: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function keyFor(pk: PK, sk: SK, prefix: string): string {
  return `${prefix}${pk}#${sk}`;
}

export async function putEntity(env: Env, entity: TableEntity): Promise<void> {
  const key = keyFor(entity.pk, entity.sk, env.TABLE_BUCKET_PREFIX);
  await env.DEVICE_DATA_BUCKET.put(key, encoder.encode(JSON.stringify(entity)), {
    httpMetadata: { contentType: "application/json" },
  });
}

export async function getEntity<T extends TableEntity = TableEntity>(
  env: Env,
  pk: PK,
  sk: SK,
): Promise<T | null> {
  const key = keyFor(pk, sk, env.TABLE_BUCKET_PREFIX);
  const obj = await env.DEVICE_DATA_BUCKET.get(key);
  if (!obj) return null;
  const text = await obj.text();
  return JSON.parse(text) as T;
}

export async function queryByPk<T extends TableEntity = TableEntity>(
  env: Env,
  pk: PK,
): Promise<T[]> {
  const prefix = `${env.TABLE_BUCKET_PREFIX}${pk}#`;
  const results: T[] = [];
  let cursor: string | undefined;

  do {
    const list = await env.DEVICE_DATA_BUCKET.list({ prefix, cursor });
    for (const obj of list.objects) {
      const res = await env.DEVICE_DATA_BUCKET.get(obj.key);
      if (!res) continue;
      const text = await res.text();
      results.push(JSON.parse(text) as T);
    }
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);

  return results;
}

export async function deleteEntity(env: Env, pk: PK, sk: SK): Promise<void> {
  const key = keyFor(pk, sk, env.TABLE_BUCKET_PREFIX);
  await env.DEVICE_DATA_BUCKET.delete(key);
}
