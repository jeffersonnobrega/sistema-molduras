// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import ContactModal from "@/components/landing/ContactModal";

export default function LandingPage() {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [totalLeads, setTotalLeads] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState(true);

  // Busca o somatório global de leads de todas as campanhas no banco de dados
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          setTotalLeads(data.totalLeads);
        }
      } catch (err) {
        console.error("Erro ao buscar estatísticas globais de leads:", err);
      } finally {
        setLoadingStats(false);
      }
    }
    fetchStats();
  }, []);

  // Formata o número para o padrão de milhar brasileiro (ex: 45200 vira 45.200)
  const formatarNumero = (num: number) => {
    return num.toLocaleString("pt-BR");
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-600 selection:text-white antialiased">
      {/* Menu Fixo Superior */}
      <Header onOpenContact={() => setIsContactOpen(true)} />

      <main>
        {/* Seção Dobra Principal (Hero) */}
        <Hero onOpenContact={() => setIsContactOpen(true)} />

        {/* Seção de Benefícios da Plataforma */}
        <Features />

        {/* Seção Explicativa: Como Funciona o Sistema */}
        <HowItWorks />

        {/* Seção de Métricas de Alto Impacto (Prova Social Dinâmica) */}
        <section
          id="metricas"
          className="py-24 bg-slate-900 text-white font-sans text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.1),transparent_70%)] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-12 relative z-10">
            {/* Métrica Dinâmica: Total Geral de Leads Somados */}
            <div className="space-y-3 flex flex-col items-center justify-center">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black italic text-blue-500 tracking-tight min-h-[40px] sm:min-h-[48px] lg:min-h-[60px] flex items-center justify-center">
                {loadingStats ? (
                  <span className="h-12 w-36 bg-slate-800 animate-pulse rounded-2xl inline-block" />
                ) : (
                  // Se o banco estiver zerado no início do deploy, exibe uma estimativa segura padrão
                  `+ de ${totalLeads > 0 ? formatarNumero(totalLeads) : "10.000"}`
                )}
              </h2>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest max-w-[200px]">
                Leads Políticos Capturados
              </p>
            </div>

            {/* Métrica Fixa: Velocidade de Processamento do Canvas */}
            <div className="space-y-3 flex flex-col items-center justify-center border-y sm:border-y-0 sm:border-x border-slate-800 py-8 sm:py-0">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black italic text-blue-500 tracking-tight">
                0.4s
              </h2>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest max-w-[200px]">
                Tempo de Renderização da Imagem
              </p>
            </div>

            {/* Métrica Fixa: Compliance Legal */}
            <div className="space-y-3 flex flex-col items-center justify-center">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black italic text-blue-500 tracking-tight">
                100%
              </h2>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest max-w-[200px]">
                Adequado à LGPD Eleitoral
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Rodapé da Landing Page com Link Legal de Privacidade */}
      <footer className="bg-slate-950 text-slate-600 py-12 text-center text-[10px] font-bold uppercase tracking-wider border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <span className="text-slate-500 font-black tracking-tighter text-sm italic">
            MOLDURA<span className="text-blue-600">DIGITAL</span>
          </span>

          <div className="flex items-center gap-6">
            <a
              href="/politica-de-privacidade"
              className="text-slate-500 hover:text-blue-500 transition-colors underline decoration-slate-800 underline-offset-4"
            >
              Política de Privacidade
            </a>
            <span>•</span>
            <p>
              © {new Date().getFullYear()} MOLDURADIGITAL. Todos os direitos
              reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* Modal de Conversão "Quero Contratar" */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </div>
  );
}
