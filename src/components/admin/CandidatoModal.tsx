"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { supabase } from "@/lib/supabase";
import { CandidatoDB, CargoPoliticoDB } from "@/types/candidato";
import {
  X,
  Upload,
  Save,
  Loader2,
  Image as ImageIcon,
  Palette,
  User,
  Hash,
} from "lucide-react";

interface ModalProps {
  candidato: CandidatoDB | null;
  onClose: () => void;
  onRefresh: () => void;
  isAdmin: boolean;
}

export default function CandidatoModal({
  candidato,
  onClose,
  onRefresh,
  isAdmin,
}: ModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingStories, setUploadingStories] = useState(false);
  const [uploadingFeed, setUploadingFeed] = useState(false);
  const [uploadingPerfil, setUploadingPerfil] = useState(false);

  // Estado para armazenar os cargos cadastrados no banco
  const [cargos, setCargos] = useState<CargoPoliticoDB[]>([]);

  const [formData, setFormData] = useState<Partial<CandidatoDB>>({
    nome_urna: "",
    slug: "",
    partido: "",
    numero_partido: 0,
    numero_candidato: "",
    url_foto_perfil: "",
    cargo_id: "",
    cor_primaria: "#2563eb",
    cor_fundo: "#F8FAFC",
    cor_titulo: "#1e293b",
    cor_texto: "#475569",
    cor_texto_hero: "#2563eb",
    cor_botao: "#2563eb",
    url_moldura: "",
    url_moldura_feed: "",
    ativo: true,
  });

  // Carrega a tabela de cargos politicos do Supabase para alimentar os selects
  useEffect(() => {
    async function fetchCargos() {
      const { data, error } = await supabase
        .from("cargos_politicos")
        .select("*")
        .order("ordem_votacao", { ascending: true });
      if (!error && data) setCargos(data);
    }
    fetchCargos();
  }, []);

  useEffect(() => {
    if (candidato) {
      setFormData({
        ...candidato,
        cor_fundo: candidato.cor_fundo || "#F8FAFC",
        cor_titulo: candidato.cor_titulo || "#1e293b",
        cor_texto: candidato.cor_texto || "#475569",
        cor_texto_hero:
          candidato.cor_texto_hero || candidato.cor_primaria || "#2563eb",
        cor_botao: candidato.cor_botao || candidato.cor_primaria || "#2563eb",
        url_moldura_feed: candidato.url_moldura_feed || "",
        numero_candidato: candidato.numero_candidato || "",
        url_foto_perfil: candidato.url_foto_perfil || "",
        cargo_id: candidato.cargo_id || "",
      });
    }
  }, [candidato]);

  // Handler de Upload Genérico para Buckets
  const handleUploadBucket = async (
    e: ChangeEvent<HTMLInputElement>,
    tipo: "stories" | "feed" | "perfil",
  ) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin || !formData.slug) return;

    if (tipo === "stories") setUploadingStories(true);
    else if (tipo === "feed") setUploadingFeed(true);
    else setUploadingPerfil(true);

    try {
      const fileName = `${formData.slug}/${tipo}-${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage
        .from("molduras")
        .upload(fileName, file);

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("molduras").getPublicUrl(fileName);

      const mapeamentoChave = {
        stories: "url_moldura",
        feed: "url_moldura_feed",
        perfil: "url_foto_perfil",
      };

      setFormData((prev) => ({
        ...prev,
        [mapeamentoChave[tipo]]: publicUrl,
      }));
    } catch (error: any) {
      alert("Erro no upload: " + error.message);
    } finally {
      setUploadingStories(false);
      setUploadingFeed(false);
      setUploadingPerfil(false);
    }
  };

  const handleSalvar = async () => {
    if (!formData.slug) return alert("O Slug é obrigatório!");
    if (!formData.cargo_id) return alert("Selecione o Cargo do Candidato!");
    setLoading(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      const payload = {
        ...formData,
        id: candidato?.id,
        user_id: candidato?.user_id || user?.id,
      };

      const { error } = await supabase.from("candidatos").upsert(payload);

      if (error) throw error;
      onRefresh();
      onClose();
    } catch (error: any) {
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] flex flex-col rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
        <header className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">
            {candidato ? "Configurar" : "Novo"}{" "}
            <span className="text-blue-600">Perfil Eleitoral</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {/* SEÇÃO 1: INFORMAÇÕES POLÍTICAS E FOTO DE PERFIL */}
          <section className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <User size={14} className="text-blue-500" /> Informações do
              Candidato & Foto de Perfil
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200">
              {/* UPLOAD DA FOTO DE PERFIL CIRCULAR */}
              <div className="flex flex-col items-center justify-center space-y-2 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm h-full min-h-[180px]">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                  Foto de Perfil
                </span>
                <div className="relative w-28 h-28 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden group shadow-inner">
                  {formData.url_foto_perfil ? (
                    <img
                      src={formData.url_foto_perfil}
                      className="w-full h-full object-cover"
                      alt="Perfil do Candidato"
                    />
                  ) : (
                    <User className="text-slate-300" size={40} />
                  )}

                  {isAdmin && (
                    <label className="absolute inset-0 bg-blue-600/90 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 rounded-full">
                      <input
                        type="file"
                        hidden
                        onChange={(e) => handleUploadBucket(e, "perfil")}
                        accept="image/*"
                        disabled={uploadingPerfil}
                      />
                      <Upload className="text-white mb-1" size={18} />
                      <span className="text-white text-[8px] font-black uppercase text-center px-2">
                        {uploadingPerfil ? "..." : "Enviar"}
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* INPUTS DE IDENTIFICAÇÃO DIRETA E SELEÇÃO DE CARGO ATUALIZADO */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Nome na Urna"
                  value={formData.nome_urna}
                  onChange={(v: string) =>
                    setFormData({ ...formData, nome_urna: v })
                  }
                />
                <InputField
                  label="Slug (URL da Página)"
                  value={formData.slug}
                  disabled={!!candidato && !isAdmin}
                  onChange={(v: string) =>
                    setFormData({
                      ...formData,
                      slug: v.toLowerCase().replace(/\s+/g, "-"),
                    })
                  }
                />
                <InputField
                  label="Partido (Ex: PL, PT, PSD)"
                  value={formData.partido}
                  onChange={(v: string) =>
                    setFormData({ ...formData, partido: v })
                  }
                />
                <InputField
                  label="Número do Candidato (Urna)"
                  value={formData.numero_candidato}
                  onChange={(v: string) =>
                    setFormData({
                      ...formData,
                      numero_candidato: v.replace(/\D/g, ""),
                    })
                  }
                />

                {/* SELECT ATUALIZADO: Cargo Político do Candidato (Buscado direto do banco) */}
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest flex items-center gap-1">
                    <Hash size={12} /> Cargo do Candidato
                  </label>
                  <select
                    value={formData.cargo_id || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, cargo_id: e.target.value })
                    }
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700 transition-all text-sm"
                  >
                    <option value="">Selecione o cargo oficial...</option>
                    {cargos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* SEÇÃO 2: MOLDURAS (STORIES / FEED) E PALETA DE CORES */}
          <section className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Palette size={14} className="text-blue-500" /> Identidade Visual
              & Gerenciamento de Molduras
            </h4>

            <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200 flex flex-col gap-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* MOLDURA STORIES */}
                <div className="flex flex-col items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <span className="text-[9px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                    Moldura Stories (9:16)
                  </span>
                  <div className="relative w-full aspect-[9/14] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden group">
                    {formData.url_moldura ? (
                      <img
                        src={formData.url_moldura}
                        className="w-full h-full object-contain p-2"
                        alt="Stories"
                      />
                    ) : (
                      <ImageIcon className="text-slate-300" size={36} />
                    )}
                    {isAdmin && (
                      <label className="absolute inset-0 bg-blue-600/90 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all duration-300">
                        <input
                          type="file"
                          hidden
                          onChange={(e) => handleUploadBucket(e, "stories")}
                          accept="image/*"
                          disabled={uploadingStories}
                        />
                        <Upload className="text-white mb-2" size={24} />
                        <span className="text-white text-[9px] font-black uppercase tracking-tighter">
                          {uploadingStories ? "Carregando..." : "Mudar Stories"}
                        </span>
                      </label>
                    )}
                  </div>
                </div>

                {/* MOLDURA FEED */}
                <div className="flex flex-col items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                  <span className="text-[9px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                    Moldura Feed (1:1)
                  </span>
                  <div className="relative w-full aspect-[1/1] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden group">
                    {formData.url_moldura_feed ? (
                      <img
                        src={formData.url_moldura_feed}
                        className="w-full h-full object-contain p-2"
                        alt="Feed"
                      />
                    ) : (
                      <ImageIcon className="text-slate-300" size={36} />
                    )}
                    {isAdmin && (
                      <label className="absolute inset-0 bg-blue-600/90 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all duration-300">
                        <input
                          type="file"
                          hidden
                          onChange={(e) => handleUploadBucket(e, "feed")}
                          accept="image/*"
                          disabled={uploadingFeed}
                        />
                        <Upload className="text-white mb-2" size={24} />
                        <span className="text-white text-[9px] font-black uppercase tracking-tighter">
                          {uploadingFeed ? "Carregando..." : "Mudar Feed"}
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* CORES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <ColorPicker
                  label="Cor da Marca"
                  value={formData.cor_primaria!}
                  onChange={(v) =>
                    setFormData({ ...formData, cor_primaria: v })
                  }
                />
                <ColorPicker
                  label="Cor de Fundo"
                  value={formData.cor_fundo!}
                  onChange={(v) => setFormData({ ...formData, cor_fundo: v })}
                />
                <ColorPicker
                  label="Cor dos Títulos"
                  value={formData.cor_titulo!}
                  onChange={(v) => setFormData({ ...formData, cor_titulo: v })}
                />
                <ColorPicker
                  label="Cor Destaque (Hero)"
                  value={formData.cor_texto_hero!}
                  onChange={(v) =>
                    setFormData({ ...formData, cor_texto_hero: v })
                  }
                />
                <ColorPicker
                  label="Cor Descrições"
                  value={formData.cor_texto!}
                  onChange={(v) => setFormData({ ...formData, cor_texto: v })}
                />
                <ColorPicker
                  label="Cor dos Botões"
                  value={formData.cor_botao!}
                  onChange={(v) => setFormData({ ...formData, cor_botao: v })}
                />
              </div>
            </div>
          </section>
        </div>

        <footer className="p-6 border-t border-slate-100 flex gap-4 bg-slate-50">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-white text-slate-500 border border-slate-200 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-100 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={
              loading || uploadingStories || uploadingFeed || uploadingPerfil
            }
            className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            Salvar Alterações do Perfil
          </button>
        </footer>
      </div>
    </div>
  );
}

/* --- COMPONENTES AUXILIARES --- */

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const safeColor = value || "#ffffff";
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-sm">
      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <label
          className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer relative shadow-inner overflow-hidden flex-shrink-0"
          style={{ backgroundColor: safeColor }}
        >
          <input
            type="color"
            value={safeColor}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-[10px] px-3 py-2 rounded-lg border border-slate-100 outline-none focus:border-blue-400 uppercase w-full"
        />
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, disabled = false }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">
        {label}
      </label>
      <input
        disabled={disabled}
        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700 disabled:opacity-50 disabled:bg-slate-100 transition-all"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
