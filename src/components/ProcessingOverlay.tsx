// src/components/ProcessingOverlay.tsx
"use client";

export default function ProcessingOverlay() {
  return (
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-6 p-8 text-center"
      role="alert"
      aria-live="assertive"
    >
      {/* Spinner */}
      <div className="relative flex items-center justify-center w-24 h-24">
        <div className="absolute inset-0 rounded-full border-8 border-blue-100 opacity-20"></div>
        <div className="absolute inset-0 rounded-full border-8 border-t-blue-600 animate-spin"></div>
        <span className="text-4xl" aria-hidden="true">
          📸
        </span>
      </div>

      {/* Mensagens */}
      <div className="flex flex-col gap-2 max-w-sm">
        <h2 className="text-2xl font-black text-white uppercase italic leading-tight tracking-tight">
          Quase Pronto!
        </h2>
        <p className="text-sm text-slate-200 font-bold uppercase tracking-widest animate-pulse">
          Estamos gerando sua foto em <br /> alta resolução...
        </p>
        <p className="text-xs text-slate-400 mt-2">
          Isso pode levar alguns segundos. <br />
          Não feche esta página.
        </p>
      </div>
    </div>
  );
}
