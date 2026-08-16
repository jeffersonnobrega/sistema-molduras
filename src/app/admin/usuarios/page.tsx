"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { supabase } from "@/lib/supabase";
import CreateUserModal from "@/components/admin/CreateUserModal";

interface ManagedUser {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  created_at: string;
  candidatos: { nome_urna: string; slug: string } | null;
  tipo: "admin" | "candidato";
  is_current_user?: boolean;
}

export default function UsuariosAdminPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [candidatos, setCandidatos] = useState<{ slug: string; nome_urna: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão expirada.");

      const [usersResponse, candidatosResponse] = await Promise.all([
        fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } }),
        supabase.from("candidatos").select("slug, nome_urna").order("nome_urna"),
      ]);
      const body = await usersResponse.json();
      if (!usersResponse.ok) throw new Error(body.error || "Falha ao carregar usuários.");
      if (candidatosResponse.error) throw candidatosResponse.error;

      setUsers(body.users || []);
      setCandidatos(candidatosResponse.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const remover = async (user: ManagedUser) => {
    if (!window.confirm(`Remover o acesso de ${user.nome}?`)) return;
    setRemoving(user.id);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sessão expirada.");
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vinculo_id: user.id, user_id: user.user_id, tipo: user.tipo }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Falha ao remover acesso.");
      await carregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-10 text-slate-900">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col sm:flex-row gap-4 justify-between sm:items-center shadow-sm">
          <div>
            <Link href="/admin/dashboard" className="text-[10px] font-black uppercase tracking-widest text-blue-600">
              ← Voltar ao dashboard
            </Link>
            <h1 className="text-2xl font-black uppercase tracking-tight mt-2 flex items-center gap-2">
              <UserCog size={24} /> Gestão de acessos
            </h1>
            <p className="text-xs text-slate-400 mt-1">Administradores gerais e gestores vinculados a candidatos.</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
          >
            <Plus size={15} /> Novo acesso
          </button>
        </header>

        {error && <p className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 text-sm font-bold">{error}</p>}

        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
          ) : users.length === 0 ? (
            <p className="py-20 text-center text-xs font-black uppercase tracking-widest text-slate-300">Nenhum gestor cadastrado</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {users.map((user) => (
                <div key={user.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><ShieldCheck size={18} /></div>
                    <div className="min-w-0">
                      <p className="font-black uppercase text-sm truncate">{user.nome}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <span className="bg-slate-100 rounded-xl px-3 py-2 text-[10px] font-black uppercase text-slate-500">
                      {user.tipo === "admin"
                        ? "Admin geral"
                        : user.candidatos?.nome_urna || "Candidato removido"}
                    </span>
                    <button
                      onClick={() => remover(user)}
                      disabled={removing === user.id || user.is_current_user}
                      className="p-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-50"
                      title={user.is_current_user ? "Seu próprio acesso não pode ser removido" : "Remover acesso"}
                    >
                      {removing === user.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {modalOpen && (
        <CreateUserModal
          slugsCandidatos={candidatos}
          onClose={() => setModalOpen(false)}
          onSuccess={carregar}
        />
      )}
    </main>
  );
}
