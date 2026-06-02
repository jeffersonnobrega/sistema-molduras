"use client";
// src/components/landing/ContactModal.tsx

import { useState, ChangeEvent } from "react";
import { X, Send, Loader2 } from "lucide-react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CARGOS = [
  "Prefeito / Vice",
  "Vereador",
  "Deputado Federal / Estadual",
  "Agência de Marketing / Partido",
  "Outro",
];

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cargo, setCargo] = useState(CARGOS[0]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const formatWhatsapp = (value: string) => {
    const nums = value.replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 2) return nums;
    if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
  };

  const handleWhatsappChange = (e: ChangeEvent<HTMLInputElement>) => {
    setWhatsapp(formatWhatsapp(e.target.value));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const nums = whatsapp.replace(/\D/g, "");
    if (nums.length < 10) {
      setError("Digite um WhatsApp válido com DDD.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), whatsapp, cargo }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao enviar. Tente novamente.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNome("");
    setWhatsapp("");
    setCargo(CARGOS[0]);
    setError("");
    setSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-8 sm:p-10">
          {!success ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                  Leve o sistema para sua campanha
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
                  Preencha e nossa equipe entrará em contato hoje.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">
                    Seu Nome
                  </label>
                  <input
                    required
                    type="text"
                    value={nome}
                    disabled={loading}
                    onChange={(e) => {
                      setNome(e.target.value);
                      setError("");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold focus:outline-none focus:border-blue-600 transition-all disabled:opacity-50"
                    placeholder="Ex: João Silva"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">
                    WhatsApp de Contato
                  </label>
                  <input
                    required
                    type="tel"
                    value={whatsapp}
                    disabled={loading}
                    onChange={handleWhatsappChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold focus:outline-none focus:border-blue-600 transition-all disabled:opacity-50"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">
                    Cargo de Interesse
                  </label>
                  <select
                    value={cargo}
                    disabled={loading}
                    onChange={(e) => setCargo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold focus:outline-none focus:border-blue-600 transition-all text-slate-600 disabled:opacity-50"
                  >
                    {CARGOS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {error && (
                  <p className="text-[11px] text-red-600 font-bold text-center bg-red-50 py-2 px-3 rounded-xl">
                    ⚠️ {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 mt-2 active:scale-95 disabled:opacity-50 shadow-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={14} /> Enviando...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Solicitar Demonstração
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-2xl">
                ✓
              </div>
              <h3 className="text-xl font-black uppercase text-slate-900 tracking-tighter">
                Obrigado pelo contato!
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Nossa equipe de consultoria política vai te chamar no WhatsApp
                nas próximas horas.
              </p>
              <button
                onClick={handleClose}
                className="mt-4 text-[10px] font-black uppercase text-blue-600 tracking-widest hover:underline"
              >
                Fechar Janela
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
