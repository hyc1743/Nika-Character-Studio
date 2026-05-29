import { randomUUID } from 'node:crypto';

import { put } from '@vercel/blob';

import { query } from './db.js';

export function decodeBase64DataUrl(value) {
  const match = String(value || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], 'base64')
  };
}

export function artifactPathname(kind, id, name) {
  return `artifacts/${kind}/${id}-${name}`.replace(/[^a-zA-Z0-9/_ .-]/g, '_');
}

export async function createArtifact({ kind, name, contentType, data, metadata = {} }) {
  if (!kind) throw new Error('Artifact kind is required');
  if (!name) throw new Error('Artifact name is required');
  if (data == null) throw new Error('Artifact data is required');

  const id = `art_${randomUUID()}`;
  const pathname = artifactPathname(kind, id, name);
  const decoded = decodeBase64DataUrl(data);
  const body = decoded ? decoded.buffer : (typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  const finalContentType = contentType || decoded?.contentType || (typeof data === 'string' ? 'text/plain' : 'application/json');
  const blob = await put(pathname, body, {
    access: 'private',
    contentType: finalContentType,
    addRandomSuffix: false
  });

  await query`
    insert into artifacts (id, kind, pathname, url, content_type, size, metadata)
    values (${id}, ${kind}, ${blob.pathname}, ${blob.url}, ${finalContentType}, ${Buffer.byteLength(body)}, ${JSON.stringify(metadata)}::jsonb)
  `;

  return {
    id,
    kind,
    pathname: blob.pathname,
    url: blob.url,
    contentType: finalContentType,
    size: Buffer.byteLength(body),
    metadata
  };
}

export async function listArtifacts(limit = 100) {
  return query`select * from artifacts order by created_at desc limit ${limit}`;
}

export async function getArtifact(id) {
  const rows = await query`select * from artifacts where id = ${id}`;
  return rows[0] || null;
}
