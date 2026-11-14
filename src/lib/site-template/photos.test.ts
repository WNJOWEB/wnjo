import { describe, expect, it } from "vitest";
import { isPhotoRef, photoPath, photoRef, photoRefs, pickPhotos, resolvePhotos } from "./photos";
import { SAMPLE_BARBER } from "./sample";
import type { SiteContent } from "./schema";

const file = (name: string, type = "image/jpeg") => ({ path: `drafts/d/${name}`, name, size: 100, type });

describe("pickPhotos", () => {
  it("uses the first photograph as the hero and the next few as the gallery", () => {
    const r = pickPhotos([file("shop.jpg"), file("chair.png", "image/png"), file("tools.webp", "image/webp")]);
    expect(r.hero).toBe("brief-file:drafts/d/shop.jpg");
    expect(r.gallery.map((g) => g.src)).toEqual(["brief-file:drafts/d/chair.png", "brief-file:drafts/d/tools.webp"]);
  });

  it("leaves out logos, SVGs and documents", () => {
    const r = pickPhotos([file("Logo.png", "image/png"), file("mark.svg", "image/svg+xml"), file("menu.pdf", "application/pdf"), file("shop.jpg")]);
    expect(r.hero).toBe("brief-file:drafts/d/shop.jpg");
    expect(r.gallery).toEqual([]);
  });

  it("has no hero when there are no photographs, and caps the gallery", () => {
    expect(pickPhotos([]).hero).toBeUndefined();
    expect(pickPhotos(Array.from({ length: 12 }, (_, i) => file(`p${i}.jpg`))).gallery).toHaveLength(6);
  });
});

describe("references", () => {
  it("round-trip a path", () => {
    expect(photoPath(photoRef("drafts/d/a.jpg"))).toBe("drafts/d/a.jpg");
    expect(isPhotoRef("https://x.example/a.jpg")).toBe(false);
  });
});

describe("resolvePhotos", () => {
  const withPhotos = (): SiteContent => {
    const c = structuredClone(SAMPLE_BARBER);
    c.sections[0] = { kind: "hero", variant: "photo", headline: "H", intro: "I", cta: "C", image: "brief-file:drafts/d/shop.jpg" };
    c.sections.splice(3, 0, { kind: "gallery", heading: "The shop", images: [{ src: "brief-file:drafts/d/a.jpg", alt: "A" }, { src: "brief-file:drafts/d/b.jpg", alt: "B" }] });
    return c;
  };

  it("lists the private files a build uses", () => {
    expect(photoRefs(withPhotos())).toEqual(["brief-file:drafts/d/shop.jpg", "brief-file:drafts/d/a.jpg", "brief-file:drafts/d/b.jpg"]);
  });

  it("swaps in links, and drops pictures it has no link for", () => {
    const urls = new Map([["brief-file:drafts/d/shop.jpg", "https://signed.example/shop"], ["brief-file:drafts/d/a.jpg", "https://signed.example/a"]]);
    const r = resolvePhotos(withPhotos(), urls);
    expect(r.heroImage).toBe("https://signed.example/shop");
    const gallery = r.content.sections.find((s) => s.kind === "gallery");
    expect(gallery && gallery.kind === "gallery" && gallery.images.map((i) => i.src)).toEqual(["https://signed.example/a"]);
  });

  it("falls back to a plain hero when the hero photo can't be linked", () => {
    const r = resolvePhotos(withPhotos(), new Map());
    expect(r.heroImage).toBeUndefined();
    expect(r.content.sections[0]).toMatchObject({ kind: "hero", variant: "plain" });
  });
});

describe("pickPhotos: what the customer says each picture is for", () => {
  const roled = (name: string, role?: "logo" | "hero") => ({ ...file(name), ...(role ? { role } : {}) });
  it("puts the photo marked as the main one at the top, and every other photo in the gallery", () => {
    const r = pickPhotos([roled("a.jpg"), roled("b.jpg", "hero"), roled("c.jpg")]);
    expect(r.hero).toBe("brief-file:drafts/d/b.jpg");
    expect(r.gallery.map((g) => g.src)).toEqual(["brief-file:drafts/d/a.jpg", "brief-file:drafts/d/c.jpg"]);
  });
  it("leaves out a picture marked as the logo, whatever it is called", () => {
    const r = pickPhotos([roled("shopfront.jpg", "logo"), roled("a.jpg")]);
    expect(r.hero).toBe("brief-file:drafts/d/a.jpg");
    expect(r.gallery).toEqual([]);
  });
});
