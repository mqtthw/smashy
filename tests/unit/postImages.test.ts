import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { processImage, parseImageList } = await import("@/lib/postImages");
const { blockedReason } = await import("@/lib/imageSafety");

/** A phone-style photo: big, with camera details and a GPS location hidden inside. */
async function phonePhoto() {
  return sharp({ create: { width: 4000, height: 3000, channels: 3, background: { r: 200, g: 40, b: 50 } } })
    .jpeg()
    .withExif({
      IFD0: { Make: "TestPhone", Model: "Camera 9" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "29/1 25/1 0/1", GPSLongitudeRef: "W", GPSLongitude: "98/1 29/1 0/1" },
    })
    .toBuffer();
}

describe("processImage", () => {
  it("removes hidden data like GPS location", async () => {
    const input = await phonePhoto();
    expect((await sharp(input).metadata()).exif).toBeDefined(); // the test photo really has it
    const out = await processImage(input);
    const meta = await sharp(out.data).metadata();
    expect(meta.exif).toBeUndefined();
    expect(out.data.includes(Buffer.from("TestPhone"))).toBe(false);
  });

  it("shrinks to at most 1600px and saves WebP", async () => {
    const out = await processImage(await phonePhoto());
    expect([out.width, out.height]).toEqual([1600, 1200]);
    expect((await sharp(out.data).metadata()).format).toBe("webp");
  });

  it("refuses files that aren't images", async () => {
    await expect(processImage(Buffer.from("definitely not a picture"))).rejects.toThrow();
  });
});

describe("blockedReason", () => {
  const fine = { adult: "VERY_UNLIKELY", racy: "UNLIKELY", violence: "POSSIBLE", medical: "UNLIKELY", spoof: "LIKELY" } as const;
  it("lets normal images through (a fighting-game screenshot can look a bit violent)", () => {
    expect(blockedReason(fine)).toBeNull();
    expect(blockedReason({ ...fine, violence: "LIKELY" })).toBeNull();
  });
  it("blocks adult, suggestive and gory images", () => {
    expect(blockedReason({ ...fine, adult: "LIKELY" })).toBe("adult");
    expect(blockedReason({ ...fine, racy: "VERY_LIKELY" })).toBe("racy");
    expect(blockedReason({ ...fine, violence: "VERY_LIKELY" })).toBe("violence");
  });
});

describe("parseImageList", () => {
  const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
  it("keeps up to 4 valid images with trimmed descriptions", () => {
    const raw = JSON.stringify([1, 2, 3, 4, 5].map((n) => ({ id: id(n), alt: `  photo ${n} ` })));
    const list = parseImageList(raw);
    expect(list).toHaveLength(4);
    expect(list[0]).toEqual({ id: id(1), alt: "photo 1" });
  });
  it("ignores junk", () => {
    expect(parseImageList("not json")).toEqual([]);
    expect(parseImageList(JSON.stringify([{ id: "../../etc" }, { id: 5 }]))).toEqual([]);
    expect(parseImageList(null)).toEqual([]);
  });
});
