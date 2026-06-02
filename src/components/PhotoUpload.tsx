"use client";

import React, { ChangeEvent } from "react";

interface PhotoUploadProps {
  onImageSelect: (file: File) => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function PhotoUpload({ onImageSelect }: PhotoUploadProps) {
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      // Validação básica de tipo
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert("Formato inválido. Use JPG, PNG ou WEBP.");
        return;
      }

      // Validação de tamanho (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("A imagem é muito grande! Máximo 10MB.");
        return;
      }

      onImageSelect(file);
      // Limpa o value para permitir subir a mesma foto caso o usuário a delete
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
      />
      <label
        htmlFor="canvas-photo-upload"
        className="flex items-center justify-center w-full h-full cursor-pointer bg-transparent"
        title="Clique para escolher uma foto"
      >
        {/* Elemento invisível, mas com tamanho físico real para o clique */}
        <span className="sr-only">Upload de foto</span>
      </label>
    </div>
  );
}
