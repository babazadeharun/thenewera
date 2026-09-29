import { del, put } from '@vercel/blob';

export function storageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function uploadMedia(file: File, pathname: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  return put(pathname, file, { access: 'public', addRandomSuffix: true });
}

export async function deleteMedia(url: string | null | undefined) {
  if (!url || !process.env.BLOB_READ_WRITE_TOKEN) return;
  await del(url);
}
