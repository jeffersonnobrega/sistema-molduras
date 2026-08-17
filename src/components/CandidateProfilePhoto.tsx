"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, ZoomIn } from "lucide-react";

interface CandidateProfilePhotoProps {
  src?: string | null;
  nome: string;
  numero?: string | null;
  corPrimaria: string;
}

export default function CandidateProfilePhoto({
  src,
  nome,
  numero,
  corPrimaria,
}: CandidateProfilePhotoProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  if (!src) {
    return (
      <div
        className="h-10 w-10 shrink-0 rounded-full border-2 border-white/60 shadow-md"
        style={{ backgroundColor: corPrimaria }}
        aria-hidden="true"
      />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group/photo relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white/60 shadow-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
        style={{ backgroundColor: corPrimaria }}
        aria-label={`Ampliar foto de ${nome}`}
      >
        <Image
          src={src}
          alt={`Foto de ${nome}`}
          fill
          sizes="40px"
          className="object-cover"
          unoptimized
        />
        <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-white opacity-0 transition group-hover/photo:bg-slate-950/35 group-hover/photo:opacity-100">
          <ZoomIn size={15} aria-hidden="true" />
        </span>
      </button>

      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex min-h-dvh items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-label={`Foto ampliada de ${nome}`}
            onClick={() => setIsOpen(false)}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-full border border-white/20 bg-black/40 p-3 text-white transition hover:bg-black/70 sm:right-7 sm:top-7"
              aria-label="Fechar foto ampliada"
            >
              <X size={24} />
            </button>

            <div
              className="flex max-h-full max-w-4xl flex-col items-center gap-4"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative h-[72dvh] w-[min(90vw,48rem)] overflow-hidden rounded-3xl bg-black/30 shadow-2xl">
                <Image
                  src={src}
                  alt={`Foto ampliada de ${nome}`}
                  fill
                  sizes="(max-width: 768px) 90vw, 768px"
                  className="object-contain"
                  priority
                  unoptimized
                />
              </div>

              <div className="text-center text-white">
                <p className="text-lg font-black uppercase tracking-tight">
                  {nome}
                </p>
                {numero && (
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.25em] text-white/65">
                    Nº {numero}
                  </p>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
