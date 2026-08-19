import { describe, expect, it } from "vitest";
import {
  STORAGE_IMAGE_MAX_BYTES,
  validateStorageImage,
} from "../src/lib/storage-image";

function imageFile(name: string, type: string, size = 1) {
  return new File([new Uint8Array(size)], name, { type });
}

describe("validação de imagens do Storage", () => {
  it.each([
    ["moldura.png", "image/png", "png"],
    ["moldura.jpg", "image/jpeg", "jpg"],
    ["moldura.jpeg", "image/jpeg", "jpg"],
    ["moldura.webp", "image/webp", "webp"],
  ])("aceita %s com MIME correspondente", (name, type, extension) => {
    expect(validateStorageImage(imageFile(name, type))).toEqual({
      valid: true,
      extension,
    });
  });

  it("recusa MIME não permitido", () => {
    expect(validateStorageImage(imageFile("moldura.gif", "image/gif")).valid).toBe(false);
  });

  it("recusa extensão incompatível com o MIME", () => {
    expect(validateStorageImage(imageFile("moldura.webp", "image/png")).valid).toBe(false);
    expect(validateStorageImage(imageFile("moldura.png.exe", "image/png")).valid).toBe(false);
  });

  it("recusa arquivo acima de 10 MB", () => {
    const file = imageFile("moldura.png", "image/png");
    Object.defineProperty(file, "size", { value: STORAGE_IMAGE_MAX_BYTES + 1 });
    expect(validateStorageImage(file).valid).toBe(false);
  });
});
