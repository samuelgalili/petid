import { describe, expect, it } from "vitest";
import { SCENE3D_ENABLED } from "@/components/mipo/presence/scene3d";
import { isUsableMasterAvatarSrc, resolveMasterAvatarSrc } from "./masterAvatar";

const FALLBACK = "/assets/dog-official.svg";

describe("isUsableMasterAvatarSrc", () => {
  it("accepts http(s) URLs", () => {
    expect(isUsableMasterAvatarSrc("https://cdn.example/pet.png")).toBe(true);
    expect(isUsableMasterAvatarSrc("http://localhost:8080/a.png")).toBe(true);
  });

  it("accepts site-relative paths", () => {
    expect(isUsableMasterAvatarSrc("/avatars/master.webp")).toBe(true);
  });

  it("accepts data:image avatars from upload-avatar", () => {
    expect(isUsableMasterAvatarSrc("data:image/png;base64,abc")).toBe(true);
    expect(isUsableMasterAvatarSrc("data:image/jpeg;base64,/9j/")).toBe(true);
    expect(isUsableMasterAvatarSrc("  data:image/webp;base64,x  ")).toBe(true);
  });

  it("rejects empty, javascript, and protocol-relative values", () => {
    expect(isUsableMasterAvatarSrc(null)).toBe(false);
    expect(isUsableMasterAvatarSrc("")).toBe(false);
    expect(isUsableMasterAvatarSrc("   ")).toBe(false);
    expect(isUsableMasterAvatarSrc("javascript:alert(1)")).toBe(false);
    expect(isUsableMasterAvatarSrc("//evil.example/x.png")).toBe(false);
    expect(isUsableMasterAvatarSrc("not-a-url")).toBe(false);
    expect(isUsableMasterAvatarSrc("data:text/html,hi")).toBe(false);
  });
});

describe("resolveMasterAvatarSrc", () => {
  it("returns Master kind for a valid generated avatar", () => {
    const data = "data:image/png;base64,iVBORw0KGgo=";
    expect(resolveMasterAvatarSrc(data, FALLBACK)).toEqual({
      src: data,
      kind: "master",
    });
  });

  it("labels type-icon fallback when avatar_url is missing", () => {
    expect(resolveMasterAvatarSrc(null, FALLBACK)).toEqual({
      src: FALLBACK,
      kind: "type-fallback",
    });
    expect(resolveMasterAvatarSrc("", FALLBACK)).toEqual({
      src: FALLBACK,
      kind: "type-fallback",
    });
  });

  it("does not use dummy breed stock as an implicit fallback", () => {
    const resolved = resolveMasterAvatarSrc("garbage", FALLBACK);
    expect(resolved.src).toBe(FALLBACK);
    expect(resolved.kind).toBe("type-fallback");
    expect(resolved.src).not.toMatch(/doberman/i);
  });
});

describe("scene3d swap point", () => {
  it("stays disabled so V1 never bundles a 3D runtime", () => {
    expect(SCENE3D_ENABLED).toBe(false);
  });
});
