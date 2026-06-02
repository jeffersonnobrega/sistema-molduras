// src/components/landing/Features.tsx
import { Users, ShieldCheck, BarChart3, Share2 } from "lucide-react";

export default function Features() {
  const cards = [
    {
      icon: <Share2 className="text-blue-600" size={24} />,
      title: "Viralização Orgânica",
      desc: "Seus eleitores compartilham voluntariamente a identidade da sua campanha no WhatsApp, Instagram e Facebook.",
    },
    {
      icon: <Users className="text-blue-600" size={24} />,
      title: "Captura de Leads (LGPD)",
      desc: "Monte uma base massiva de contatos estruturada com nome, telefone e cidade para disparos legítimos de campanha.",
    },
    {
      icon: <BarChart3 className="text-blue-600" size={24} />,
      title: "Métricas em Tempo Real",
      desc: "Monitore visualizações, downloads realizados e cliques de compartilhamento de cada candidato pelo painel central.",
    },
    {
      icon: <ShieldCheck className="text-blue-600" size={24} />,
      title: "Segurança de Dados",
      desc: "Infraestrutura robusta integrada com Supabase, garantindo estabilidade mesmo em picos de acessos simultâneos.",
    },
  ];

  return (
    <section
      id="beneficios"
      className="py-24 bg-white border-t border-slate-100 font-sans"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-slate-900">
            Por que grandes campanhas escolhem nossa plataforma?
          </h2>
          <p className="text-slate-500 font-medium">
            Esqueça o envio manual de santinhos digitais. Automatize o
            engajamento e descentralize o marketing do seu partido político.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className="bg-slate-50/60 border border-slate-200/60 p-8 rounded-[2.5rem] hover:border-blue-200 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all group"
            >
              <div className="p-4 bg-white border rounded-2xl w-fit shadow-sm group-hover:bg-blue-50 transition-colors">
                {card.icon}
              </div>
              <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight mt-6 mb-2">
                {card.title}
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed font-medium">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
