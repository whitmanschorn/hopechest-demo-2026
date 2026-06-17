/**
 * Pure image-upload helpers — validation + the dev data-URL encoding. Kept free
 * of the @vercel/blob import so they're cheap to unit-test (see storage-provider.ts).
 */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB

export function isAllowedImage(type: string): boolean {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
}

/**
 * Modern iPhones save photos as HEIC, which most non-Safari browsers can't
 * decode or display — so we convert them to JPEG client-side before upload.
 * The `type` is often empty or unreliable for HEIC, so we also sniff the name.
 */
export function isHeic(file: { name: string; type: string }): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.(heic|heif)$/i.test(file.name)
  );
}

/** Encode the real uploaded bytes as a data: URL (the no-token dev storage path). */
export async function fileToDataUrl(file: File): Promise<string> {
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  return `data:${file.type};base64,${base64}`;
}
