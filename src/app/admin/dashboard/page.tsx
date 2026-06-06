"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  ExternalLink,
  CheckCircle2,
  XCircle,
  LayoutGrid,
} from "lucide-react";

type FilterStatus = "ativos" | "inativos" | "todos";

export default function AdminDashboard() {
  const [candidatos, setCandidatos] = useState<CandidatoDB[]>([]);
  const [activeTab, setActiveTab] = useState<"stats" | "leads">("stats");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ativos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [selectedCandidato, setSelectedCandidato] =
    useState<CandidatoDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminGeral, setIsAdminGeral] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return;
      setCurrentUserId(userId);

      const { data: adminCheck } = await supabase.rpc("is_admin", {
        uid: userId,
      });
      setIsAdminGeral(!!adminCheck);

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

  // Candidatos filtrados conforme o filtro selecionado
  const candidatosFiltrados = useMemo(() => {
    if (filterStatus === "ativos") return candidatos.filter((c) => c.ativo);
    if (filterStatus === "inativos") return candidatos.filter((c) => !c.ativo);
    return candidatos;
  }, [candidatos, filterStatus]);

  // Contagens para os badges dos filtros
  const counts = useMemo(
    () => ({
      ativos: candidatos.filter((c) => c.ativo).length,
      inativos: candidatos.filter((c) => !c.ativo).length,
      todos: candidatos.length,
    }),
    [candidatos],
  );

  // Totais consolidados (sempre sobre todos, não filtrados)
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
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 flex flex-col md:h-screen md:sticky top-0 z-10 shadow-sm shrink-0">
        <div className="p-8 pb-6">
          <h1 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800">
            SIND <span className="text-blue-600">ADMIN</span>
          </h1>
        </div>

        <nav className="px-4 space-y-1">
          <TabButton
            active={activeTab === "stats"}
            onClick={() => setActiveTab("stats")}
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
          />
          <TabButton
            active={activeTab === "leads"}
            onClick={() => setActiveTab("leads")}
            icon={<Users size={18} />}
            label="Base de Leads"
          />
        </nav>

        {isAdminGeral && (
          <div className="px-4 mt-1">
            <a
              href="/admin/colinha"
              className="flex items-center gap-4 w-full p-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all"
            >
              <Plus size={18} className="text-blue-500 shrink-0" />
              Configurar Colinha
            </a>
          </div>
        )}

        <div className="flex-1" />

        <div className="p-4 border-t border-slate-100 space-y-1">
          {isAdminGeral && (
            <button
              onClick={() => setIsCreateUserOpen(true)}
              className="flex items-center gap-3 w-full p-4 rounded-2xl text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600 transition-all group"
            >
              <UserPlus
                size={18}
                className="group-hover:scale-110 transition-transform shrink-0"
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
              className="group-hover:translate-x-1 transition-transform shrink-0"
            />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* HEADER */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-900">
                {activeTab === "stats" ? "Performance" : "Relatórios de Leads"}
              </h2>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-1">
                <UserCircle size={13} className="text-blue-500" />
                {isAdminGeral
                  ? "Administrador Geral"
                  : candidatos[0]?.nome_urna || "Candidato"}
              </span>
            </div>

            {isAdminGeral && activeTab === "stats" && (
              <button
                onClick={() => {
                  setSelectedCandidato(null);
                  setIsModalOpen(true);
                }}
                className="bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg active:scale-95 shrink-0"
              >
                <Plus size={15} /> Adicionar Perfil
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
                <div className="space-y-8">
                  {/* MÉTRICAS TOTAIS — só admin geral */}
                  {isAdminGeral && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <MetricCard
                        label="Views"
                        value={totais.views}
                        icon={<Eye size={18} />}
                      />
                      <MetricCard
                        label="Leads"
                        value={totais.leads}
                        icon={<Users size={18} />}
                      />
                      <MetricCard
                        label="Downloads"
                        value={totais.downloads}
                        icon={<Download size={18} />}
                      />
                      <MetricCard
                        label="Cliques Zap"
                        value={totais.shares}
                        icon={<Share2 size={18} />}
                      />
                    </div>
                  )}

                  {/* FILTROS DE STATUS */}
                  {isAdminGeral && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <FilterChip
                        active={filterStatus === "ativos"}
                        onClick={() => setFilterStatus("ativos")}
                        icon={<CheckCircle2 size={13} />}
                        label="Ativos"
                        count={counts.ativos}
                        colorActive="bg-emerald-600 text-white border-emerald-600"
                        colorInactive="border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600"
                      />
                      <FilterChip
                        active={filterStatus === "inativos"}
                        onClick={() => setFilterStatus("inativos")}
                        icon={<XCircle size={13} />}
                        label="Inativos"
                        count={counts.inativos}
                        colorActive="bg-red-500 text-white border-red-500"
                        colorInactive="border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-500"
                      />
                      <FilterChip
                        active={filterStatus === "todos"}
                        onClick={() => setFilterStatus("todos")}
                        icon={<LayoutGrid size={13} />}
                        label="Todos"
                        count={counts.todos}
                        colorActive="bg-slate-800 text-white border-slate-800"
                        colorInactive="border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700"
                      />
                    </div>
                  )}

                  {/* CARDS DOS CANDIDATOS */}
                  {candidatosFiltrados.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {candidatosFiltrados.map((c) => (
                        <CandidatoCard
                          key={c.id}
                          candidato={c}
                          onEdit={() => {
                            setSelectedCandidato(c);
                            setIsModalOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      filterStatus={filterStatus}
                      isAdminGeral={isAdminGeral}
                      onAdd={() => {
                        setSelectedCandidato(null);
                        setIsModalOpen(true);
                      }}
                    />
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

// ─── SUB-COMPONENTES ────────────────────────────────────────────────

function CandidatoCard({
  candidato: c,
  onEdit,
}: {
  candidato: CandidatoDB;
  onEdit: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-[2rem] border shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 flex flex-col ${
        c.ativo ? "border-slate-200" : "border-red-100 bg-red-50/30"
      }`}
    >
      {/* Status badge */}
      <div className="px-5 pt-4 flex justify-end">
        <span
          className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
            c.ativo
              ? "bg-emerald-50 text-emerald-600"
              : "bg-red-50 text-red-500"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${c.ativo ? "bg-emerald-500" : "bg-red-400"}`}
          />
          {c.ativo ? "Ativo" : "Inativo"}
        </span>
      </div>

      {/* Cabeçalho do card */}
      <div className="flex items-center gap-4 px-5 pb-4 pt-2">
        <div
          className="w-13 h-13 rounded-full overflow-hidden bg-slate-100 border-2 shadow-sm flex items-center justify-center shrink-0"
          style={{
            borderColor: c.cor_primaria || "#e2e8f0",
            width: 52,
            height: 52,
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
            <User className="text-slate-300" size={22} />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-black uppercase italic text-slate-800 text-base leading-tight truncate">
            {c.nome_urna}
          </h3>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-0.5 truncate">
            {c.partido} · Nº {c.numero_candidato} · /{c.slug}
          </p>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-1 mx-5 mb-4 py-4 border-y border-slate-50">
        <MiniStat label="Views" value={c.total_views} />
        <MiniStat label="Leads" value={c.stats_leads_count} />
        <MiniStat label="Col." value={c.stats_colinha_downloads} />
        <MiniStat label="Zaps" value={c.total_shares} />
      </div>

      {/* Ações */}
      <div className="px-5 pb-5 flex flex-col gap-2 mt-auto">
        <button
          onClick={onEdit}
          className="w-full py-3 bg-slate-50 text-slate-600 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Settings2 size={13} /> Editar Perfil
        </button>
        <a
          href={`/candidato/${c.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 border border-slate-200 text-slate-500 rounded-xl font-black uppercase text-[9px] tracking-widest hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <ExternalLink size={13} /> Ir para a Página
        </a>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  icon,
  label,
  count,
  colorActive,
  colorInactive,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  colorActive: string;
  colorInactive: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
        active ? colorActive : `bg-white ${colorInactive}`
      }`}
    >
      {icon}
      {label}
      <span
        className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black ${
          active ? "bg-white/25 text-inherit" : "bg-slate-100 text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyState({
  filterStatus,
  isAdminGeral,
  onAdd,
}: {
  filterStatus: FilterStatus;
  isAdminGeral: boolean;
  onAdd: () => void;
}) {
  const messages: Record<FilterStatus, { title: string; sub: string }> = {
    ativos: {
      title: "Nenhum candidato ativo",
      sub: "Ative um candidato existente ou adicione um novo.",
    },
    inativos: {
      title: "Nenhum candidato inativo",
      sub: "Todos os candidatos estão ativos.",
    },
    todos: {
      title: "Nenhum candidato cadastrado",
      sub: "Adicione o primeiro candidato para começar.",
    },
  };
  const { title, sub } = messages[filterStatus];

  return (
    <div className="text-center py-20 space-y-4">
      <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto">
        <Users size={30} className="text-blue-300" />
      </div>
      <p className="text-sm font-black uppercase text-slate-400 tracking-widest">
        {title}
      </p>
      <p className="text-xs text-slate-400">{sub}</p>
      {isAdminGeral && filterStatus !== "inativos" && (
        <button
          onClick={onAdd}
          className="bg-blue-600 text-white px-7 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all inline-flex items-center gap-2 shadow-lg active:scale-95"
        >
          <Plus size={15} /> Adicionar candidato
        </button>
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
      className={`flex items-center gap-3 w-full p-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
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
    <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm hover:border-blue-200 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
          {label}
        </p>
        <div className="p-1.5 bg-slate-50 rounded-xl text-slate-400">
          {icon}
        </div>
      </div>
      <h2 className="text-2xl md:text-3xl font-black tabular-nums tracking-tighter">
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
