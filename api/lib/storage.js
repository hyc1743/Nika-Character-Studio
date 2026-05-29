import { randomUUID } from 'node:crypto';

import { query } from './db.js';

export async function getKv(key) {
  const rows = await query`select value from kv_store where key = ${key}`;
  return rows[0]?.value ?? null;
}

export async function setKv(key, value) {
  await query`
    insert into kv_store (key, value, updated_at)
    values (${key}, ${JSON.stringify(value)}::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
}

export async function removeKv(key) {
  await query`delete from kv_store where key = ${key}`;
}

export async function listCharacters() {
  return query`select id, data, updated_at from characters order by updated_at desc`;
}

export async function getCharacter(id) {
  const rows = await query`select id, data, updated_at from characters where id = ${id}`;
  return rows[0] || null;
}

export async function saveCharacter(data, id = data?.id || `char_${randomUUID()}`) {
  await query`
    insert into characters (id, data, updated_at)
    values (${id}, ${JSON.stringify({ ...data, id })}::jsonb, now())
    on conflict (id) do update set data = excluded.data, updated_at = now()
  `;
  return id;
}

export async function deleteCharacter(id) {
  await query`delete from characters where id = ${id}`;
}
