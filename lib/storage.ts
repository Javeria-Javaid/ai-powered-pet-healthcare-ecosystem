// Supabase Storage REST client for Medical Documents (blueprint Section 13).
// Called only from server-side route handlers: the service_role key must never
// reach the browser — clients only receive short-lived signed URLs generated here.
// Implements the raw REST surface (no SDK dependency):
//   bucket create/get, object upload, signed URL, object delete.

export const STORAGE_BUCKET = 'pet-documents';
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
];

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

export function isStorageConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function storageUrl(path: string) {
  const base = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  return `${base}/storage/v1${path}`;
}

function storageHeaders(extra: Record<string, string> = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra,
  };
}

// Object keys are hierarchical; encode each segment without touching the slashes.
function encodeObjectPath(objectKey: string) {
  return objectKey.split('/').map(encodeURIComponent).join('/');
}

async function readErrorBody(res: Response) {
  const text = await res.text().catch(() => '');
  return `status ${res.status}${text ? `: ${text.slice(0, 300)}` : ''}`;
}

// Create the private pet-documents bucket on first use. The result is cached so
// concurrent uploads share one check; a failure clears the cache for a retry.
let bucketReady: Promise<void> | null = null;

export function ensureBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const checkRes = await fetch(storageUrl(`/bucket/${STORAGE_BUCKET}`), {
        headers: storageHeaders(),
      });
      if (checkRes.ok) return;

      if (checkRes.status !== 404) {
        throw new StorageError(`Bucket check failed (${await readErrorBody(checkRes)})`);
      }

      const createRes = await fetch(storageUrl('/bucket'), {
        method: 'POST',
        headers: storageHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: STORAGE_BUCKET,
          public: false,
          file_size_limit: MAX_FILE_SIZE_BYTES,
          allowed_mime_types: ALLOWED_MIME_TYPES,
        }),
      });
      // 409 means someone else created it first (e.g. a concurrent request)
      if (!createRes.ok && createRes.status !== 409) {
        throw new StorageError(`Bucket creation failed (${await readErrorBody(createRes)})`);
      }
    })().catch((err) => {
      bucketReady = null;
      throw err;
    });
  }
  return bucketReady;
}

export async function uploadObject(objectKey: string, body: ArrayBuffer, contentType: string) {
  const res = await fetch(storageUrl(`/object/${STORAGE_BUCKET}/${encodeObjectPath(objectKey)}`), {
    method: 'POST',
    headers: storageHeaders({ 'Content-Type': contentType }),
    body,
  });
  if (!res.ok) {
    throw new StorageError(`Upload failed (${await readErrorBody(res)})`);
  }
}

export async function createSignedUrl(objectKey: string, expiresIn: number = 3600) {
  const res = await fetch(storageUrl(`/object/sign/${STORAGE_BUCKET}/${encodeObjectPath(objectKey)}`), {
    method: 'POST',
    headers: storageHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ expiresIn }),
  });
  if (!res.ok) {
    throw new StorageError(`Signed URL failed (${await readErrorBody(res)})`);
  }
  const data = await res.json();
  const raw: string = data.signedURL || '';
  // signedURL may come back relative (/object/sign/...) or absolute depending on API version
  return raw.startsWith('http') ? raw : `${storageUrl('').replace('/storage/v1', '')}${raw}`;
}

export async function deleteObject(objectKey: string) {
  const res = await fetch(storageUrl(`/object/${STORAGE_BUCKET}`), {
    method: 'DELETE',
    headers: storageHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefixes: [objectKey] }),
  });
  if (!res.ok && res.status !== 404) {
    throw new StorageError(`Delete failed (${await readErrorBody(res)})`);
  }
}
