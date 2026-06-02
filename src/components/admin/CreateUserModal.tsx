"use client";
// components/admin/CreateUserModal.tsx

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, Loader2, UserPlus, ShieldCheck, User } from "lucide-react";

interface CreateUserModalProps {
  slugsCandidatos: { slug: string; nome_urna: string }[]; // lista para vincular candidato
  onClose: () => void;
  onSuccess: () => void;
}

type Tipo = "admin" | "candidato";

export default function CreateUserModal({
  slugsCandidatos,
  onClose,
  onSuccess,
}: CreateUserModalProps) {
  const [tipo, setTipo] = useState<Tipo>("candidato");
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [slugCandidato, setSlugCandidato] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !nome) {
      setError("Email e nome são obrigatórios.");
      return;
    }
    if (tipo === "candidato" && !slugCandidato) {
      setError("Selecione o candidato a vincular.");
      return;
    }

    setLoading(true);
    try {
      // Pega o token do usuário logado para autenticar a chamada
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");

      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          nome: nome.trim(),
          tipo,
          slug_candidato: tipo === "candidato" ? slugCandidato : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao criar usuário.");
        return;
      }

      setSuccess(data.message);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <header className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">
            Criar <span className="text-blue-600">Acesso</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"
          >
            <X size={22} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Tipo de acesso */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setTipo("candidato");
                setError("");
              }}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-[10px] font-black uppercase tracking-widest ${
                tipo === "candidato"
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-400 hover:border-slate-300"
              }`}
            >
              <User size={20} />
              Candidato
            </button>
            <button
              type="button"
              onClick={() => {
                setTipo("admin");
                setSlugCandidato("");
                setError("");
              }}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-[10px] font-black uppercase tracking-widest ${
                tipo === "admin"
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-400 hover:border-slate-300"
              }`}
            >
              <ShieldCheck size={20} />
              Admin Geral
            </button>
          </div>

          {/* Nome */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">
              Nome
            </label>
            <input
              type="text"
              placeholder="Nome completo"
              value={nome}
              disabled={loading}
              onChange={(e) => {
                setNome(e.target.value);
                setError("");
              }}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 text-sm disabled:opacity-50 transition-all"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">
              Email
            </label>
            <input
              type="email"
              placeholder="email@dominio.com"
              value={email}
              disabled={loading}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 text-sm disabled:opacity-50 transition-all"
            />
          </div>

          {/* Vinculação ao candidato (só para tipo candidato) */}
          {tipo === "candidato" && (
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">
                Vincular ao Candidato
              </label>
              <select
                value={slugCandidato}
                disabled={loading}
                onChange={(e) => {
                  setSlugCandidato(e.target.value);
                  setError("");
                }}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700 text-sm disabled:opacity-50 transition-all"
              >
                <option value="">Selecione o candidato...</option>
                {slugsCandidatos.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.nome_urna} · /{c.slug}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Feedback */}
          {error && (
            <p className="text-[11px] text-red-600 font-bold text-center bg-red-50 py-2 px-3 rounded-xl">
              ⚠️ {error}
            </p>
          )}
          {success && (
            <p className="text-[11px] text-green-600 font-bold text-center bg-green-50 py-2 px-3 rounded-xl">
              ✅ {success}
            </p>
          )}

          {/* Info sobre o fluxo */}
          {!success && (
            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              O usuário receberá um email com link para definir a senha.
            </p>
          )}

          {/* Botões */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="py-3 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !!success}
              className="py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-100"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={14} /> Enviando...
                </>
              ) : (
                <>
                  <UserPlus size={14} /> Criar & Convidar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
