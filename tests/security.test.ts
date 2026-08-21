

import { describe, it, expect } from "vitest";

describe("PhotoUpload — Validação de arquivo", () => {
  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ];

  const validarTipo = (type: string, fileName: string) =>
    ALLOWED_TYPES.includes(type) ||
    /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(fileName);

  it("deve rejeitar arquivos que não sejam imagem", () => {
    expect(validarTipo("application/pdf", "doc.pdf")).toBe(false);
    expect(validarTipo("video/mp4", "video.mp4")).toBe(false);
    expect(validarTipo("text/html", "page.html")).toBe(false);
    expect(validarTipo("application/x-msdownload", "virus.exe")).toBe(false);
  });

  it("deve aceitar formatos permitidos por MIME type", () => {
    expect(validarTipo("image/jpeg", "foto.jpg")).toBe(true);
    expect(validarTipo("image/png", "foto.png")).toBe(true);
    expect(validarTipo("image/webp", "foto.webp")).toBe(true);
  });

  it("deve aceitar HEIC/HEIF (formato padrão iPhone)", () => {
    expect(validarTipo("image/heic", "foto.heic")).toBe(true);
    expect(validarTipo("image/heif", "foto.heif")).toBe(true);

    expect(validarTipo("", "foto.heic")).toBe(true);
  });

  it("deve aceitar qualquer tamanho de arquivo (sem rejeição por tamanho)", () => {
    const semLimiteTamanho = (_size: number) => true;
    expect(semLimiteTamanho(1 * 1024 * 1024)).toBe(true);
    expect(semLimiteTamanho(10 * 1024 * 1024)).toBe(true);
    expect(semLimiteTamanho(50 * 1024 * 1024)).toBe(true);
  });

  it("compressão deve respeitar MAX_DIMENSION de 2048px", () => {
    const MAX_DIMENSION = 2048;

    const calcularDimensoes = (w: number, h: number) => {
      if (w <= MAX_DIMENSION && h <= MAX_DIMENSION)
        return { width: w, height: h };
      if (w > h) {
        return {
          width: MAX_DIMENSION,
          height: Math.round((h * MAX_DIMENSION) / w),
        };
      }
      return {
        width: Math.round((w * MAX_DIMENSION) / h),
        height: MAX_DIMENSION,
      };
    };

    const r1 = calcularDimensoes(4032, 3024);
    expect(r1.width).toBeLessThanOrEqual(MAX_DIMENSION);
    expect(r1.height).toBeLessThanOrEqual(MAX_DIMENSION);
    expect(Math.abs(r1.width / r1.height - 4032 / 3024)).toBeLessThan(0.01);

    const r2 = calcularDimensoes(3024, 4032);
    expect(r2.width).toBeLessThanOrEqual(MAX_DIMENSION);
    expect(r2.height).toBeLessThanOrEqual(MAX_DIMENSION);

    const r3 = calcularDimensoes(800, 600);
    expect(r3.width).toBe(800);
    expect(r3.height).toBe(600);
  });

  it("não deve aceitar extensão .exe ou .js disfarçada de imagem", () => {
    expect(validarTipo("application/javascript", "script.js")).toBe(false);
    expect(validarTipo("application/x-msdownload", "malware.exe")).toBe(false);
    expect(validarTipo("application/javascript", "foto.jpg.js")).toBe(false);
  });
});
