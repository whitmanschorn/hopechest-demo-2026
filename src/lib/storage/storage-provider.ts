/**
 * Image storage seam. Real uploads go to Vercel Blob in production (when
 * BLOB_READ_WRITE_TOKEN is set); everywhere else — local dev and CI — a dev
 * provider inlines the real bytes as a data: URL, so the feature works with zero
 * config and no external service (the same hermetic stance as the dev
 * PhoneProvider in src/lib/auth/phone-provider.ts). The plain <img> in Img.tsx
 * renders both blob and data: URLs directly, so no next/image config is needed.
 */
import { put } from "@vercel/blob";

import { fileToDataUrl } from "./image";

export interface StorageProvider {
  /** Persist an uploaded image and return its public URL. */
  put(file: File): Promise<{ url: string }>;
}

export { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, isAllowedImage } from "./image";

const blobStorageProvider: StorageProvider = {
  async put(file) {
    const { url } = await put(file.name || "upload", file, { access: "public", addRandomSuffix: true });
    return { url };
  },
};

// No blob token (local/CI): store the real bytes inline so uploads still persist.
const devStorageProvider: StorageProvider = {
  async put(file) {
    return { url: await fileToDataUrl(file) };
  },
};

export function getStorageProvider(): StorageProvider {
  return process.env.BLOB_READ_WRITE_TOKEN ? blobStorageProvider : devStorageProvider;
}
