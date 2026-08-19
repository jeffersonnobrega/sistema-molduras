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

type AccessType = "admin" | "candidato";

export default function CreateUserModal({
  slugsCandidatos,
  onClose,
  onSuccess,
}: CreateUserModalProps) {
  const [tipo, setTipo] = useState<AccessType>("candidato");
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
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
    if (tipo === "candidato" && selectedSlugs.length === 0) {
      setError("Selecione ao menos um candidato para vincular.");
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
          slug_candidatos:
            tipo === "candidato" ? selectedSlugs : undefined,
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
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTipo("candidato")}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 text-[10px] font-black uppercase ${tipo === "candidato" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-400"}`}
            >
              <User size={20} /> Gestor de candidato
            </button>
            <button
              type="button"
              onClick={() => {
                setTipo("admin");
                setSelectedSlugs([]);
              }}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 text-[10px] font-black uppercase ${tipo === "admin" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-400"}`}
            >
              <ShieldCheck size={20} /> Admin geral
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

          {/* Vínculos do gestor com um ou mais candidatos */}
          {tipo === "candidato" && <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">
                Vincular aos candidatos
              </label>
              <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2 space-y-1">
                {slugsCandidatos.map((c) => (
                  <label
                    key={c.slug}
                    className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 text-sm font-bold text-slate-700 cursor-pointer hover:bg-blue-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSlugs.includes(c.slug)}
                      disabled={loading}
                      onChange={(e) => {
                        setSelectedSlugs((current) =>
                          e.target.checked
                            ? [...current, c.slug]
                            : current.filter((slug) => slug !== c.slug),
                        );
                        setError("");
                      }}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="min-w-0 truncate">
                      {c.nome_urna} · /{c.slug}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 ml-1">
                {selectedSlugs.length} candidato(s) selecionado(s)
              </p>
          </div>}

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
              Um novo usuário receberá o convite por email. Se o email já
              existir, apenas os novos candidatos serão vinculados.
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
                  <UserPlus size={14} /> Salvar acesso
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
