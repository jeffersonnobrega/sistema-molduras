// src/components/landing/Hero.tsx
import { Target, Users2, ShieldCheck, Zap } from "lucide-react";

interface HeroProps {
  onOpenContact: () => void;
}

export default function Hero({ onOpenContact }: HeroProps) {
  return (
    <section className="pt-32 pb-20 bg-gradient-to-b from-blue-50/50 via-white to-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Texto Principal */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
            <Zap size={12} className="fill-blue-600" /> Eleições 2026:
            Tecnologia Viral
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tighter text-slate-900 leading-[0.95]">
            Transforme cada apoiador em um{" "}
            <span className="text-blue-600 italic">outdoor digital</span> da sua
            campanha.
          </h1>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto lg:mx-0 font-medium">
            Uma plataforma de engajamento onde seus eleitores geram fotos
            personalizadas com a moldura oficial do candidato em segundos.
            Capture leads qualificados e domine as redes sociais.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <button
              onClick={onOpenContact}
              className="w-full sm:w-auto bg-blue-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95"
            >
              Digitalizar Minha Campanha
            </button>
            <a
              href="#como-funciona"
              className="w-full sm:w-auto text-center border border-slate-200 bg-white text-slate-700 px-8 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-50 transition-all"
            >
              Ver Como Funciona
            </a>
          </div>
        </div>

        {/* Painel Visual / Mockup Interativo (Simulação UX) */}
        <div className="lg:col-span-5 relative flex justify-center">
          <div className="absolute inset-0 bg-blue-200 rounded-full filter blur-3xl opacity-30 -z-10 animate-pulse" />
          <div className="bg-white p-4 rounded-[3rem] border border-slate-200 shadow-2xl max-w-[340px] w-full relative animate-in slide-in-from-bottom-8 duration-700">
            {/* Header Simulado do Candidato */}
            <div className="flex items-center gap-3 border-b pb-4 mb-4 border-slate-100">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xs">
                26
              </div>
              <div>
                <h4 className="font-black uppercase text-xs text-slate-800 leading-none">
                  Maria Silva
                </h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                  Deputado Federal
                </p>
              </div>
            </div>
            {/* Canvas de Foto Simulado */}
            <div className="aspect-[4/5] bg-slate-100 rounded-[2rem] overflow-hidden relative border border-slate-200/60 flex items-center justify-center group">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop"
                className="w-full h-full object-cover grayscale-[20%]"
                alt="Exemplo de Apoiador"
              />
              {/* Moldura Fictícia Sobreposta */}
              <div className="absolute inset-0 border-[12px] border-blue-600 flex flex-col justify-end p-3 text-white pointer-events-none bg-gradient-to-t from-blue-900/80 via-transparent to-transparent">
                <span className="font-black tracking-tighter text-xl uppercase leading-none italic">
                  SOU SILVA
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-90">
                  CONFIRME 26123
                </span>
              </div>
            </div>
            <div className="mt-4 bg-slate-50 p-3 rounded-2xl text-center">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                ⚡ Processamento Client-side em 0.4s
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
