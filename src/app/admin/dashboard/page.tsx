"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { CandidatoDB } from "@/types/candidato";
import CandidatoModal from "@/components/admin/CandidatoModal";
import LeadsTable from "@/components/admin/LeadsTable";
import CreateUserModal from "@/components/admin/CreateUserModal";
import {
  LayoutDashboard,
  Users,
  LogOut,
  Plus,
  Settings2,
  Eye,
  Share2,
  UserCircle,
  Loader2,
  Download,
  User,
  UserPlus,
} from "lucide-react";

export default function AdminDashboard() {
  const [candidatos, setCandidatos] = useState<CandidatoDB[]>([]);
  const [activeTab, setActiveTab] = useState<"stats" | "leads">("stats");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [selectedCandidato, setSelectedCandidato] =
    useState<CandidatoDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminGeral, setIsAdminGeral] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    try {
      // 1. Pega o usuário logado
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return;
      setCurrentUserId(userId);

      // 2. Verifica se é admin geral via RPC (seguro, usa SECURITY DEFINER)
      const { data: adminCheck } = await supabase.rpc("is_admin", {
        uid: userId,
      });
      setIsAdminGeral(!!adminCheck);

      // 3. Carrega candidatos:
      //    - Admin geral: todos
      //    - Candidato: só o próprio (vinculado pelo user_id)
      const query = supabase
        .from("candidatos")
        .select("*")
        .order("created_at", { ascending: false });
      const finalQuery = adminCheck ? query : query.eq("user_id", userId);

      const { data, error } = await finalQuery;
      if (!error && data) setCandidatos(data);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const totais = candidatos.reduce(
    (acc, curr) => ({
      views: acc.views + (curr.total_views || 0),
      leads: acc.leads + (curr.stats_leads_count || 0),
      shares: acc.shares + (curr.total_shares || 0),
      downloads: acc.downloads + (curr.stats_colinha_downloads || 0),
    }),
    { views: 0, leads: 0, shares: 0, downloads: 0 },
  );

  const slugsCandidatos = candidatos.map((c) => ({
    slug: c.slug,
    nome_urna: c.nome_urna,
  }));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      {/* SIDEBAR */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 flex flex-col md:h-screen md:sticky top-0 z-10 shadow-sm">
        <div className="p-8">
          <h1 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800">
            SIND <span className="text-blue-600">ADMIN</span>
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <TabButton
            active={activeTab === "stats"}
            onClick={() => setActiveTab("stats")}
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
          />
          <TabButton
            active={activeTab === "leads"}
            onClick={() => setActiveTab("leads")}
            icon={<Users size={20} />}
            label="Base de Leads"
          />
          {isAdminGeral && (
            <a
              href="/admin/colinha"
              className="flex items-center gap-4 w-full p-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all"
            >
              <Plus size={20} className="text-blue-500" /> Configurar Colinha
            </a>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-1">
          {/* Botão criar usuário — só admin geral */}
          {isAdminGeral && (
            <button
              onClick={() => setIsCreateUserOpen(true)}
              className="flex items-center gap-3 w-full p-4 rounded-2xl text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600 transition-all group"
            >
              <UserPlus
                size={18}
                className="group-hover:scale-110 transition-transform"
              />
              Criar Acesso
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-4 rounded-2xl text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all group"
          >
            <LogOut
              size={18}
              className="group-hover:translate-x-1 transition-transform"
            />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">
                {activeTab === "stats" ? "Performance" : "Relatórios de Leads"}
              </h2>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-1">
                <UserCircle size={14} className="text-blue-500" />
                {isAdminGeral
                  ? "Administrador Geral"
                  : candidatos[0]?.nome_urna || "Candidato"}
              </span>
            </div>

            {/* Botão adicionar candidato — admin geral, aba stats */}
            {isAdminGeral && activeTab === "stats" && (
              <button
                onClick={() => {
                  setSelectedCandidato(null);
                  setIsModalOpen(true);
                }}
                className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg active:scale-95"
              >
                <Plus size={16} /> Adicionar Perfil
              </button>
            )}
          </header>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <Loader2 className="animate-spin text-blue-600" size={48} />
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Sincronizando Dados...
              </p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeTab === "stats" ? (
                <div className="space-y-10">
                  {/* Totais — só admin geral vê o consolidado */}
                  {isAdminGeral && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <MetricCard
                        label="Views"
                        value={totais.views}
                        icon={<Eye size={20} />}
                      />
                      <MetricCard
                        label="Leads"
                        value={totais.leads}
                        icon={<Users size={20} />}
                      />
                      <MetricCard
                        label="Downloads"
                        value={totais.downloads}
                        icon={<Download size={20} />}
                      />
                      <MetricCard
                        label="Cliques Zap"
                        value={totais.shares}
                        icon={<Share2 size={20} />}
                      />
                    </div>
                  )}

                  {/* Cards dos candidatos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {candidatos.map((c) => (
                      <div
                        key={c.id}
                        className={`bg-white p-6 rounded-[2.5rem] border shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 relative group ${
                          c.ativo
                            ? "border-slate-200"
                            : "border-red-100 bg-red-50/20"
                        }`}
                      >
                        <div className="flex items-center gap-4 mb-6">
                          <div className="relative">
                            <div
                              className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 border-2 shadow-sm flex items-center justify-center"
                              style={{
                                borderColor: c.cor_primaria || "#e2e8f0",
                              }}
                            >
                              {c.url_foto_perfil ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={c.url_foto_perfil}
                                  className="w-full h-full object-cover"
                                  alt={c.nome_urna}
                                />
                              ) : (
                                <User className="text-slate-300" size={24} />
                              )}
                            </div>
                            <div
                              className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${
                                c.ativo ? "bg-emerald-500" : "bg-red-500"
                              }`}
                            />
                          </div>
                          <div className="truncate">
                            <h3 className="font-black uppercase italic text-slate-800 text-lg leading-tight">
                              {c.nome_urna}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: c.cor_primaria }}
                              />
                              <p className="text-[9px] font-bold text-slate-400 uppercase">
                                {c.partido} · Nº {c.numero_candidato} · /
                                {c.slug}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-1 mb-6 border-y py-6 border-slate-50">
                          <MiniStat label="Views" value={c.total_views} />
                          <MiniStat label="Leads" value={c.stats_leads_count} />
                          <MiniStat
                            label="Colinhas"
                            value={c.stats_colinha_downloads}
                          />
                          <MiniStat label="Zaps" value={c.total_shares} />
                        </div>

                        <button
                          onClick={() => {
                            setSelectedCandidato(c);
                            setIsModalOpen(true);
                          }}
                          className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl font-black uppercase text-[9px] hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                          <Settings2 size={14} /> Editar Perfil
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Estado vazio — admin sem candidatos */}
                  {candidatos.length === 0 && !loading && (
                    <div className="text-center py-24 space-y-4">
                      <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto">
                        <Users size={36} className="text-blue-300" />
                      </div>
                      <p className="text-sm font-black uppercase text-slate-400 tracking-widest">
                        Nenhum candidato cadastrado
                      </p>
                      {isAdminGeral && (
                        <button
                          onClick={() => {
                            setSelectedCandidato(null);
                            setIsModalOpen(true);
                          }}
                          className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all inline-flex items-center gap-2 shadow-lg"
                        >
                          <Plus size={16} /> Adicionar primeiro candidato
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                  <LeadsTable
                    slug={isAdminGeral ? undefined : candidatos[0]?.slug}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* MODAIS */}
      {isModalOpen && (
        <CandidatoModal
          candidato={selectedCandidato}
          onClose={() => setIsModalOpen(false)}
          onRefresh={carregarDados}
          isAdmin={isAdminGeral}
        />
      )}

      {isCreateUserOpen && (
        <CreateUserModal
          slugsCandidatos={slugsCandidatos}
          onClose={() => setIsCreateUserOpen(false)}
          onSuccess={carregarDados}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 w-full p-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
        active
          ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
          : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:border-blue-200 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
          {label}
        </p>
        <div className="p-2 bg-slate-50 rounded-xl text-slate-400">{icon}</div>
      </div>
      <h2 className="text-3xl font-black tabular-nums tracking-tighter">
        {value?.toLocaleString("pt-BR") || 0}
      </h2>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-[7px] font-black text-slate-300 uppercase tracking-tighter mb-1">
        {label}
      </p>
      <p className="text-xs font-black text-slate-700">{value || 0}</p>
    </div>
  );
}
