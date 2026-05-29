import { put } from '@vercel/blob';

export async function putJsonArtifact(pathname, data, options = {}) {
  const blob = await put(pathname, JSON.stringify(data, null, 2), {
    access: options.access || 'private',
    contentType: 'application/json',
    addRandomSuffix: options.addRandomSuffix ?? true
  });
  return blob;
}
