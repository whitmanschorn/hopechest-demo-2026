import { ALLOWED_IMAGE_TYPES, fileToDataUrl, isAllowedImage, isHeic } from "@/lib/storage/image";

describe("isAllowedImage", () => {
  test("accepts every supported image type", () => {
    for (const t of ALLOWED_IMAGE_TYPES) expect(isAllowedImage(t)).toBe(true);
  });
  test("rejects non-image and unsupported types", () => {
    expect(isAllowedImage("application/pdf")).toBe(false);
    expect(isAllowedImage("image/tiff")).toBe(false);
    expect(isAllowedImage("")).toBe(false);
  });
});

describe("isHeic", () => {
  test("detects HEIC/HEIF by mime type", () => {
    expect(isHeic({ name: "blob", type: "image/heic" })).toBe(true);
    expect(isHeic({ name: "blob", type: "image/heif" })).toBe(true);
  });
  test("detects HEIC/HEIF by extension when the mime is empty (iOS quirk)", () => {
    expect(isHeic({ name: "IMG_1234.HEIC", type: "" })).toBe(true);
    expect(isHeic({ name: "photo.heif", type: "" })).toBe(true);
  });
  test("leaves ordinary web images alone", () => {
    expect(isHeic({ name: "photo.jpg", type: "image/jpeg" })).toBe(false);
    expect(isHeic({ name: "photo.png", type: "image/png" })).toBe(false);
  });
});

describe("fileToDataUrl", () => {
  test("encodes the real bytes as a data: URL with the file's mime", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const file = new File([bytes], "x.png", { type: "image/png" });
    const url = await fileToDataUrl(file);
    expect(url).toBe(`data:image/png;base64,${Buffer.from(bytes).toString("base64")}`);
  });
});
