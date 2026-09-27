export function isVercelRuntime() {
  return Boolean(process.env.VERCEL);
}

export function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/** Blob on Vercel; local `.data/` only on your machine. */
export function useBlobPersistence() {
  return isVercelRuntime() || hasBlobToken();
}

export function canUseLocalDisk() {
  return !isVercelRuntime();
}

export function requireBlobTokenForWrites() {
  if (isVercelRuntime() && !hasBlobToken()) {
    throw new Error(
      "Configura BLOB_READ_WRITE_TOKEN en Vercel (Storage → Blob) para guardar datos.",
    );
  }
}
