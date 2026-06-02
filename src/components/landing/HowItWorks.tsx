// src/components/landing/HowItWorks.tsx
import { UploadCloud, UserCheck, Share2 } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      icon: <UploadCloud size={24} className="text-blue-600" />,
      stepNumber: "01",
      title: "Sua equipe configura",
      desc: "Em minutos, através do painel administrativo, você cadastra o candidato, define as cores da campanha e faz o upload das molduras oficiais (formatos Feed e Stories).",
    },
    {
      icon: <UserCheck size={24} className="text-blue-600" />,
      stepNumber: "02",
      title: "O apoiador acessa e engaja",
      desc: "O eleitor entra na página exclusiva do candidato via celular, preenche os dados de contato exigidos pela LGPD e escolhe uma foto direto da sua galeria ou câmera.",
    },
    {
      icon: <Share2 size={24} className="text-blue-600" />,
      stepNumber: "03",
      title: "A mágica acontece",
      desc: "O sistema processa a foto com a moldura em menos de meio segundo. O eleitor faz o download ou compartilha direto no WhatsApp com um clique, espalhando sua campanha.",
    },
  ];

  return (
    <section
      id="como-funciona"
      className="py-24 bg-slate-50 border-t border-slate-200/60 font-sans"
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Alinhamento de Cabeçalho */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
            Fluxo Simplificado
          </div>
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-slate-900">
            Três passos para viralizar sua campanha
          </h2>
          <p className="text-slate-500 font-medium text-sm">
            Desenvolvido para ser incrivelmente rápido no celular do eleitor e
            intuitivo no painel da sua agência.
          </p>
        </div>

        {/* Grid de Passos (Timeline Responsiva) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center lg:items-start text-center lg:text-left relative group"
            >
              {/* Ícone e Indicador do Passo */}
              <div className="flex items-center gap-4 mb-6">
                <div className="p-5 bg-white border border-slate-200 rounded-[1.8rem] shadow-sm group-hover:border-blue-500 group-hover:shadow-md transition-all relative z-10">
                  {step.icon}
                </div>
                <span className="text-5xl font-black italic text-slate-200/80 select-none tracking-tighter">
                  {step.stepNumber}
                </span>
              </div>

              {/* Textos */}
              <div className="space-y-2 max-w-sm">
                <h3 className="text-xl font-black uppercase text-slate-800 tracking-tight">
                  {step.title}
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed font-medium">
                  {step.desc}
                </p>
              </div>

              {/* Linha conectora visual (Apenas para Desktop) */}
              {idx < 2 && (
                <div className="hidden lg:block absolute top-10 left-[40%] w-[50%] h-[2px] bg-gradient-to-r from-slate-200 to-transparent -z-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
