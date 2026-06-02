// src/components/landing/Header.tsx
"use client";

import { useState } from "react";
import { Menu, X, Rocket } from "lucide-react";

interface HeaderProps {
  onOpenContact: () => void;
}

export default function Header({ onOpenContact }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setIsOpen(false);
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-40 border-b border-slate-100 font-sans">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <span className="text-xl font-black uppercase italic tracking-tighter text-slate-900">
            MOLDURA<span className="text-blue-600">DIGITAL</span>
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-slate-500">
          <button
            onClick={() => scrollToSection("beneficios")}
            className="hover:text-blue-600 transition-colors"
          >
            Benefícios
          </button>
          <button
            onClick={() => scrollToSection("como-funciona")}
            className="hover:text-blue-600 transition-colors"
          >
            Como Funciona
          </button>
          <button
            onClick={() => scrollToSection("metricas")}
            className="hover:text-blue-600 transition-colors"
          >
            Resultados
          </button>
        </nav>

        <div className="hidden md:flex items-center">
          <button
            onClick={onOpenContact}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-100 active:scale-95 flex items-center gap-2"
          >
            <Rocket size={14} /> Quero Contratar
          </button>
        </div>

        {/* Mobile Burger */}
        <button
          className="md:hidden text-slate-800"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-6 py-6 space-y-4 flex flex-col animate-in fade-in slide-in-from-top-5 duration-200">
          <button
            onClick={() => scrollToSection("beneficios")}
            className="text-left font-black uppercase text-xs tracking-wider text-slate-600 py-2"
          >
            Benefícios
          </button>
          <button
            onClick={() => scrollToSection("como-funciona")}
            className="text-left font-black uppercase text-xs tracking-wider text-slate-600 py-2"
          >
            Como Funciona
          </button>
          <button
            onClick={() => scrollToSection("metricas")}
            className="text-left font-black uppercase text-xs tracking-wider text-slate-600 py-2"
          >
            Resultados
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              onOpenContact();
            }}
            className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase text-center text-xs tracking-widest"
          >
            Quero Contratar
          </button>
        </div>
      )}
    </header>
  );
}
