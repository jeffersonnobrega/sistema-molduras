export const STORAGE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const STORAGE_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";

const EXTENSION_BY_MIME = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

const EXTENSIONS_BY_MIME: Record<string, readonly string[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
};

export type StorageImageValidation =
  | { valid: true; extension: "png" | "jpg" | "webp" }
  | { valid: false; error: string };

export function validateStorageImage(file: File): StorageImageValidation {
  const allowedExtensions = EXTENSIONS_BY_MIME[file.type];
  if (!allowedExtensions) {
    return { valid: false, error: "Envie uma imagem PNG, JPG ou WEBP." };
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: "A extensão do arquivo não corresponde ao tipo da imagem.",
    };
  }

  if (file.size > STORAGE_IMAGE_MAX_BYTES) {
    return { valid: false, error: "A imagem deve ter no máximo 10 MB." };
  }

  return { valid: true, extension: EXTENSION_BY_MIME[file.type as keyof typeof EXTENSION_BY_MIME] };
}
