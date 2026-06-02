"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Loader2,
  Search,
  Calendar,
  Phone,
  User,
  Tag,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";

interface Lead {
  id: string;
  nome: string;
  whatsapp: string;
  candidato_slug: string;
  created_at: string;
  // ✅ Nova tipagem mapeando o relacionamento trazido pelo JOIN do Supabase
  candidatos?: {
    nome_urna: string;
    url_foto_perfil: string | null;
  } | null;
}

interface LeadsTableProps {
  slug?: string; // Se for admin, o slug será undefined
}

export default function LeadsTable({ slug }: LeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  /* ===============================
     CARREGAR LEADS WITH JOIN
  ================================ */
  const carregarLeads = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ Modificado o select para trazer as informações da tabela candidatos via FK
      let query = supabase
        .from("leads")
        .select(
          `
          id,
          nome,
          whatsapp,
          candidato_slug,
          created_at,
          candidatos (
            nome_urna,
            url_foto_perfil
          )
        `,
        )
        .order("created_at", { ascending: false });

      // Se houver slug → candidato vê só os dele
      if (slug) {
        query = query.eq("candidato_slug", slug);
      }

      const { data, error } = await query;
      if (error) throw error;

      setLeads((data as unknown as Lead[]) || []);
    } catch (error) {
      console.error("Erro ao carregar leads:", error);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    carregarLeads();
  }, [carregarLeads]);

  /* ===============================
     FILTRO LOCAL
  ================================ */
  const leadsFiltrados = leads.filter((lead) => {
    const termo = searchTerm.toLowerCase();
    return (
      lead.nome?.toLowerCase().includes(termo) ||
      lead.whatsapp.includes(searchTerm) ||
      lead.candidato_slug.toLowerCase().includes(termo) ||
      lead.candidatos?.nome_urna?.toLowerCase().includes(termo)
    );
  });

  /* ===============================
     EXPORTAÇÃO EXCEL (.xlsx)
  ================================ */
  const exportarExcel = () => {
    const dados = leadsFiltrados.map((lead) => ({
      Nome: lead.nome || "Não informado",
      WhatsApp: lead.whatsapp,
      ...(slug
        ? {}
        : {
            Candidato: lead.candidatos?.nome_urna || lead.candidato_slug,
          }),
      "Data de Captura": new Date(lead.created_at).toLocaleString("pt-BR"),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dados);

    // Largura das colunas
    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 20 },
      ...(slug ? [] : [{ wch: 24 }]),
      { wch: 24 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

    XLSX.writeFile(
      workbook,
      `leads-${slug || "todos"}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  /* ===============================
     LOADING
  ================================ */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
          Consultando Banco de Dados...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* BARRA DE TOOLS */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between gap-4 bg-slate-50/30">
        {/* BUSCA */}
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Pesquisar por nome, zap ou slug..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-blue-500 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* INFO + DOWNLOAD */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
            Total: {leadsFiltrados.length} Registros
          </span>

          <button
            onClick={exportarExcel}
            disabled={leadsFiltrados.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow hover:bg-emerald-700 transition-all disabled:opacity-40"
          >
            <Download size={14} />
            Baixar Excel
          </button>
        </div>
      </div>

      {/* TABELA */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <User size={14} /> Nome do Lead
                </div>
                platform
              </th>

              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Phone size={14} /> WhatsApp
                </div>
              </th>

              {!slug && (
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Tag size={14} /> Origem (Candidato)
                  </div>
                </th>
              )}

              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Calendar size={14} /> Data Captura
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-50">
            {leadsFiltrados.length > 0 ? (
              leadsFiltrados.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-blue-50/30 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-700 uppercase">
                      {lead.nome || "Não Informado"}
                    </p>
                  </td>

                  <td className="px-6 py-4">
                    <a
                      href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      className="text-sm font-mono text-slate-500 hover:text-green-600 transition-colors"
                    >
                      {lead.whatsapp}
                    </a>
                  </td>

                  {/* VISÃO GERAL DO ADMIN COM MINIATURA DA FOTO DO CANDIDATO */}
                  {!slug && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        {lead.candidatos?.url_foto_perfil ? (
                          <img
                            src={lead.candidatos.url_foto_perfil}
                            alt=""
                            className="h-6 w-6 rounded-full object-cover border border-slate-200 shadow-sm"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-[8px] font-bold text-slate-400">
                            N/F
                          </div>
                        )}
                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg uppercase">
                          {lead.candidatos?.nome_urna ||
                            `/${lead.candidato_slug}`}
                        </span>
                      </div>
                    </td>
                  )}

                  <td className="px-6 py-4 text-sm text-slate-400">
                    {new Date(lead.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={slug ? 3 : 4} className="px-6 py-20 text-center">
                  <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">
                    Nenhum lead encontrado
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
