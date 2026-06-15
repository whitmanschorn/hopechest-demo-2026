import { ALLOWED_IMAGE_TYPES, fileToDataUrl, isAllowedImage } from "@/lib/storage/image";

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

describe("fileToDataUrl", () => {
  test("encodes the real bytes as a data: URL with the file's mime", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const file = new File([bytes], "x.png", { type: "image/png" });
    const url = await fileToDataUrl(file);
    expect(url).toBe(`data:image/png;base64,${Buffer.from(bytes).toString("base64")}`);
  });
});
