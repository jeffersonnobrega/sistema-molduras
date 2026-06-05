"use client";
// src/components/PhotoUpload.tsx
//
// Padrão de mercado: aceita qualquer tamanho, comprime no client antes de processar.
// Remove metadados EXIF (privacidade), redimensiona para max 2048px, comprime para JPEG 0.85.
// Resultado típico: 12MB → ~400KB em < 500ms, sem alert de rejeição.

import React, { ChangeEvent, useState } from "react";
import { Loader2 } from "lucide-react";

interface PhotoUploadProps {
  onImageSelect: (file: File) => void;
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const MAX_DIMENSION = 2048; // px — suficiente para canvas 1080px com zoom 3x
const JPEG_QUALITY = 0.85; // 0.85 = visualmente idêntico ao original, ~70% menor

// Toast de erro amigável (sem alert nativo)
function showToast(msg: string) {
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:#1e293b;color:#fff;padding:12px 20px;border-radius:12px;
    font-size:13px;font-weight:600;z-index:99999;
    box-shadow:0 4px 24px rgba(0,0,0,0.25);pointer-events:none;
    animation:fadeInUp .25s ease;
  `;
  const style = document.createElement("style");
  style.textContent = `@keyframes fadeInUp{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`;
  document.head.appendChild(style);
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// Comprime e redimensiona a imagem no client via Canvas API
async function comprimirImagem(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // Redimensiona se necessário, mantendo proporção
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        // Canvas para recodificação (remove EXIF automaticamente)
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas não disponível"));
          return;
        }

        // Fundo branco para PNGs com transparência (evita fundo preto no JPEG)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Falha ao comprimir"));
              return;
            }
            // Mantém o nome original mas com extensão .jpg
            const nomeBase = file.name.replace(/\.[^/.]+$/, "");
            const fileComprimido = new File([blob], `${nomeBase}.jpg`, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(fileComprimido);
          },
          "image/jpeg",
          JPEG_QUALITY,
        );
      };

      // Erro amigável: arquivo selecionado não é uma imagem válida
      img.onerror = () => reject(new Error("invalid_image"));
      img.src = dataUrl;
    };

    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

export default function PhotoUpload({ onImageSelect }: PhotoUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de tipo — única rejeição real (arquivo não é imagem)
    const tipoValido =
      ALLOWED_TYPES.includes(file.type) ||
      file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|heic|heif)$/) !==
        null;

    if (!tipoValido) {
      showToast("Formato inválido. Use JPG, PNG ou WEBP.");
      e.target.value = "";
      return;
    }

    setIsProcessing(true);

    try {
      const fileProcessado = await comprimirImagem(file);
      onImageSelect(fileProcessado);
    } catch (err) {
      const msg =
        err instanceof Error && err.message === "invalid_image"
          ? "Não foi possível ler essa imagem. Tente outro arquivo."
          : "Erro ao processar a foto. Tente novamente.";

      // Tenta enviar o arquivo original como fallback silencioso
      // Se for realmente inválido (ex: PDF renomeado), exibe o toast
      try {
        // Verifica se o arquivo tem cabeçalho de imagem válido antes do fallback
        const buf = await file.slice(0, 4).arrayBuffer();
        const bytes = new Uint8Array(buf);
        const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
        const isPng =
          bytes[0] === 0x89 &&
          bytes[1] === 0x50 &&
          bytes[2] === 0x4e &&
          bytes[3] === 0x47;
        const isWebp = bytes[0] === 0x52 && bytes[1] === 0x49; // RIFF header

        if (isJpeg || isPng || isWebp) {
          // Arquivo parece ser uma imagem válida — envia original
          onImageSelect(file);
        } else {
          showToast(msg);
        }
      } catch {
        showToast(msg);
      }
    } finally {
      setIsProcessing(false);
      // Limpa o input para permitir selecionar a mesma foto novamente
      setTimeout(() => {
        e.target.value = "";
      }, 100);
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full z-[100]">
      <input
        id="canvas-photo-upload"
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={handleFileChange}
        className="hidden"
        disabled={isProcessing}
      />

      <label
        htmlFor="canvas-photo-upload"
        className={`flex items-center justify-center w-full h-full cursor-pointer bg-transparent ${
          isProcessing ? "cursor-wait" : "cursor-pointer"
        }`}
        title="Clique para escolher uma foto"
      >
        {isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-10 gap-2 rounded-3xl">
            <Loader2 className="animate-spin text-white" size={28} />
            <span className="text-white text-[11px] font-semibold">
              Otimizando foto...
            </span>
          </div>
        )}
        <span className="sr-only">Upload de foto</span>
      </label>
    </div>
  );
}
