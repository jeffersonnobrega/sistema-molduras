"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  // 1. O estado inicia como 'false' e só mudará após a montagem completa
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("lgpd_cookies_accepted");

    if (!accepted) {
      const timer = setTimeout(() => {
        setShouldShow(true);
      }, 0);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("lgpd_cookies_accepted", "true");
    setShouldShow(false);
  };

  // 3. Se não deve mostrar, o retorno é nulo (Server-side safe)
  if (!shouldShow) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-[100] animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-3xl p-6 flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1">
          <h4 className="text-xs font-black uppercase tracking-tighter text-slate-800 mb-1">
            Privacidade e Cookies 🍪
          </h4>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Utilizamos cookies para entender o alcance desta campanha e melhorar
            sua experiência conforme nossa
            <Link href="/politica-de-privacidade" className="underline ml-1">
              Política de Privacidade
            </Link>
            . . Ao continuar, você concorda com o uso de tecnologias de rastreio
            estatístico.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={handleAccept}
            className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
