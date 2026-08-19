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
  Plus,
  Trash2,
} from "lucide-react";

// Tipo de um conjunto de molduras
interface MolduraSet {
  label: string;
  stories: string;
  feed: string;
  perfil?: string;
}

interface ModalProps {
  candidato: CandidatoDB | null;
  onClose: () => void;
  onRefresh: () => void;
  isAdmin: boolean;
}

const MOLDURA_VAZIA: MolduraSet = {
  label: "",
  stories: "",
  feed: "",
  perfil: "",
};
const MAX_MOLDURAS = 3;

export default function CandidatoModal({
  candidato,
  onClose,
  onRefresh,
  isAdmin,
}: ModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingPerfil, setUploadingPerfil] = useState(false);
  const [uploadingMoldura, setUploadingMoldura] = useState<string | null>(null); // "0-stories" | "1-feed" etc.
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
    ativo: true,
  });

  // Estado separado para os conjuntos de molduras
  const [molduras, setMolduras] = useState<MolduraSet[]>([
    { ...MOLDURA_VAZIA, label: "Moldura 1" },
  ]);
  const [pendingStorageDeletes, setPendingStorageDeletes] = useState<string[]>(
    [],
  );

  const queueStorageDelete = (url?: string) => {
    if (!url) return;
    setPendingStorageDeletes((current) =>
      current.includes(url) ? current : [...current, url],
    );
  };

  useEffect(() => {
    supabase
      .from("cargos_politicos")
      .select("*")
      .order("ordem_votacao", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setCargos(data);
      });
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
        numero_candidato: candidato.numero_candidato || "",
        url_foto_perfil: candidato.url_foto_perfil || "",
        cargo_id: candidato.cargo_id || "",
      });

      // Carrega os conjuntos de molduras do JSONB
      const moldurasExistentes = candidato.molduras as
        | MolduraSet[]
        | undefined;
      if (moldurasExistentes && moldurasExistentes.length > 0) {
        setMolduras(moldurasExistentes);
      } else {
        // Retrocompatibilidade: candidato sem JSONB mas com colunas antigas
        const legado: MolduraSet[] = [];
        if (candidato.url_moldura || candidato.url_moldura_feed) {
          legado.push({
            label: "Moldura 1",
            stories: candidato.url_moldura || "",
            feed: candidato.url_moldura_feed || "",
          });
        }
        setMolduras(
          legado.length > 0
            ? legado
            : [{ ...MOLDURA_VAZIA, label: "Moldura 1" }],
        );
      }
    }
  }, [candidato]);

  // =========================
  // Upload de foto de perfil
  // =========================
  const handleUploadPerfil = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formData.slug) return;
    setUploadingPerfil(true);
    try {
      const fileName = `${formData.slug}/perfil-${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage
        .from("molduras")
        .upload(fileName, file);
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from("molduras").getPublicUrl(fileName);
      queueStorageDelete(formData.url_foto_perfil);
      setFormData((prev) => ({ ...prev, url_foto_perfil: publicUrl }));
    } catch (error: unknown) {
      alert("Erro no upload: " + getErrorMessage(error));
    } finally {
      setUploadingPerfil(false);
    }
  };

  // =========================
  // Upload de moldura (stories ou feed) para um conjunto específico
  // =========================
  const handleUploadMoldura = async (
    e: ChangeEvent<HTMLInputElement>,
    index: number,
    tipo: "stories" | "feed" | "perfil",
  ) => {
    const file = e.target.files?.[0];
    if (!file || !formData.slug) return;

    const key = `${index}-${tipo}`;
    const previousUrl = molduras[index]?.[tipo];
    setUploadingMoldura(key);

    try {
      const fileName = `${formData.slug}/${tipo}-${index + 1}-${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage
        .from("molduras")
        .upload(fileName, file);
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from("molduras").getPublicUrl(fileName);

      queueStorageDelete(previousUrl);
      setMolduras((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [tipo]: publicUrl };
        return updated;
      });
    } catch (error: unknown) {
      alert("Erro no upload: " + getErrorMessage(error));
    } finally {
      setUploadingMoldura(null);
    }
  };

  // =========================
  // Gerenciar conjuntos
  // =========================
  const adicionarMoldura = () => {
    if (molduras.length >= MAX_MOLDURAS) return;
    setMolduras((prev) => [
      ...prev,
      { ...MOLDURA_VAZIA, label: `Moldura ${prev.length + 1}` },
    ]);
  };

  const removerMoldura = (index: number) => {
    if (molduras.length <= 1) return;
    const moldura = molduras[index];
    if (!window.confirm(`Excluir o conjunto "${moldura.label}"?`)) return;
    queueStorageDelete(moldura.stories);
    queueStorageDelete(moldura.feed);
    queueStorageDelete(moldura.perfil);
    setMolduras((prev) => prev.filter((_, i) => i !== index));
  };

  const removerArquivoMoldura = (
    index: number,
    tipo: "stories" | "feed" | "perfil",
  ) => {
    const url = molduras[index]?.[tipo];
    if (!url || !window.confirm("Excluir esta moldura?")) return;
    queueStorageDelete(url);
    setMolduras((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [tipo]: "" };
      return updated;
    });
  };

  const removerFotoPerfil = () => {
    if (
      !formData.url_foto_perfil ||
      !window.confirm("Excluir a foto de perfil do candidato?")
    ) {
      return;
    }
    queueStorageDelete(formData.url_foto_perfil);
    setFormData((prev) => ({ ...prev, url_foto_perfil: "" }));
  };

  const atualizarLabel = (index: number, label: string) => {
    setMolduras((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], label };
      return updated;
    });
  };

  // =========================
  // Salvar
  // =========================
  const handleSalvar = async () => {
    if (!formData.slug) return alert("O Slug é obrigatório!");
    if (!formData.cargo_id) return alert("Selecione o Cargo do Candidato!");
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      // Pega a primeira moldura para manter retrocompatibilidade nas colunas antigas
      const primeiraMoldura = molduras[0] || MOLDURA_VAZIA;

      const payload: Partial<CandidatoDB> = {
        nome_urna: formData.nome_urna,
        partido: formData.partido,
        numero_partido: formData.numero_partido,
        numero_candidato: formData.numero_candidato,
        url_foto_perfil: formData.url_foto_perfil,
        cargo_id: formData.cargo_id,
        cor_primaria: formData.cor_primaria,
        cor_fundo: formData.cor_fundo,
        cor_titulo: formData.cor_titulo,
        cor_texto: formData.cor_texto,
        cor_texto_hero: formData.cor_texto_hero,
        cor_botao: formData.cor_botao,
        // Identidade e status são campos sistêmicos. Gestores não devem nem
        // enviá-los; o trigger do banco continua sendo a proteção definitiva.
        ...(isAdmin
          ? { slug: formData.slug, ativo: formData.ativo }
          : {}),
        ...(!candidato ? { user_id: user?.id } : {}),
        // O cargo do candidato também é o slot que fica travado na colinha.
        cargo_travado_id: formData.cargo_id,
        // Retrocompatibilidade: mantém colunas antigas com a primeira moldura
        url_moldura: primeiraMoldura.stories || "",
        url_moldura_feed: primeiraMoldura.feed || "",
        // Novo JSONB com todos os conjuntos
        molduras: molduras.filter((m) => m.stories || m.feed || m.perfil),
      };

      const { error } = candidato
        ? await supabase.from("candidatos").update(payload).eq("id", candidato.id)
        : await supabase.from("candidatos").insert(payload);
      if (error) throw error;

      const retainedUrls = new Set(
        [
          formData.url_foto_perfil,
          ...molduras.flatMap((moldura) => [
            moldura.stories,
            moldura.feed,
            moldura.perfil,
          ]),
        ].filter(Boolean),
      );
      const pathsToDelete = [
        ...new Set(
          pendingStorageDeletes
            .filter((url) => !retainedUrls.has(url))
            .map(getMoldurasStoragePath)
            .filter((path): path is string => Boolean(path)),
        ),
      ];
      if (pathsToDelete.length > 0) {
        const { error: storageDeleteError } = await supabase.storage
          .from("molduras")
          .remove(pathsToDelete);
        if (storageDeleteError) {
          alert(
            "A configuração foi salva, mas um arquivo antigo não pôde ser removido do armazenamento.",
          );
        }
      }

      onRefresh();
      onClose();
    } catch (error: unknown) {
      alert(`Erro ao salvar: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const isUploading = uploadingPerfil || uploadingMoldura !== null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] flex flex-col rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
        <header className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
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

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10">
          {/* ===== SEÇÃO 1: IDENTIDADE ===== */}
          <section className="space-y-4">
            <SectionTitle
              icon={<User size={14} className="text-blue-500" />}
              label="Candidato & Foto de Perfil"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
              {/* Foto de perfil */}
              <div className="flex flex-col items-center justify-center space-y-2 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm h-full min-h-[180px]">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                  Foto de Perfil
                </span>
                <div className="relative w-28 h-28 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden group shadow-inner">
                  {formData.url_foto_perfil ? (
                    <img
                      src={formData.url_foto_perfil}
                      className="w-full h-full object-cover"
                      alt="Perfil"
                    />
                  ) : (
                    <User className="text-slate-300" size={40} />
                  )}
                  {formData.url_foto_perfil && (
                    <button
                      type="button"
                      onClick={removerFotoPerfil}
                      className="absolute top-1 right-1 z-20 p-2 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700"
                      title="Excluir foto de perfil"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <label className="absolute inset-0 bg-blue-600/90 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 rounded-full">
                      <input
                        type="file"
                        hidden
                        onChange={handleUploadPerfil}
                        accept="image/*"
                        disabled={uploadingPerfil}
                      />
                      <Upload className="text-white mb-1" size={18} />
                      <span className="text-white text-[8px] font-black uppercase text-center px-2">
                        {uploadingPerfil ? "..." : "Enviar"}
                      </span>
                  </label>
                </div>
              </div>

              {/* Inputs */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Nome na Urna"
                  value={formData.nome_urna}
                  onChange={(v) => setFormData({ ...formData, nome_urna: v })}
                />
                <InputField
                  label="Slug (URL)"
                  value={formData.slug}
                  disabled={!!candidato && !isAdmin}
                  onChange={(v) =>
                    setFormData({
                      ...formData,
                      slug: v.toLowerCase().replace(/\s+/g, "-"),
                    })
                  }
                />
                <InputField
                  label="Partido"
                  value={formData.partido}
                  onChange={(v) => setFormData({ ...formData, partido: v })}
                />
                <InputField
                  label="Número (Urna)"
                  value={formData.numero_candidato}
                  onChange={(v) =>
                    setFormData({
                      ...formData,
                      numero_candidato: v.replace(/\D/g, ""),
                    })
                  }
                />
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
                    <option value="">Selecione o cargo...</option>
                    {cargos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
                {isAdmin && candidato && (
                  <label className="sm:col-span-2 flex items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-2xl cursor-pointer">
                    <span>
                      <span className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">
                        Perfil ativo
                      </span>
                      <span className="block text-xs text-slate-400 mt-1">
                        Controla a disponibilidade pública da campanha.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={formData.ativo !== false}
                      onChange={(e) =>
                        setFormData({ ...formData, ativo: e.target.checked })
                      }
                      className="h-5 w-5 accent-blue-600"
                    />
                  </label>
                )}
              </div>
            </div>
          </section>

          {/* ===== SEÇÃO 2: MOLDURAS ===== */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <SectionTitle
                icon={<ImageIcon size={14} className="text-blue-500" />}
                label={`Conjuntos de Molduras (${molduras.length}/${MAX_MOLDURAS})`}
              />
              {molduras.length < MAX_MOLDURAS && (
                <button
                  onClick={adicionarMoldura}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all"
                >
                  <Plus size={13} /> Adicionar Conjunto
                </button>
              )}
            </div>

            <div className="space-y-6">
              {molduras.map((moldura, index) => (
                <div
                  key={index}
                  className="bg-slate-50 p-5 rounded-[2rem] border border-slate-200 space-y-4"
                >
                  {/* Header do conjunto */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="shrink-0 w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-black">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={moldura.label}
                        onChange={(e) => atualizarLabel(index, e.target.value)}
                        placeholder={`Moldura ${index + 1}`}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    {molduras.length > 1 && (
                      <button
                        onClick={() => removerMoldura(index)}
                        className="shrink-0 p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors text-slate-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Upload stories + feed */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(["stories", "feed", "perfil"] as const).map((tipo) => {
                      const uploadKey = `${index}-${tipo}`;
                      const isUp = uploadingMoldura === uploadKey;
                      const url = moldura[tipo] ?? "";
                      const label =
                        tipo === "stories"
                          ? "Stories (9:16)"
                          : tipo === "feed"
                            ? "Feed (proporção livre)"
                            : "Perfil (1:1)";

                      return (
                        <div
                          key={tipo}
                          className="flex flex-col items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"
                        >
                          <span className="text-[9px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                            {label}
                          </span>
                          <div
                            className={`relative w-full bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden group ${tipo === "stories" ? "aspect-[9/14]" : "aspect-square"}`}
                          >
                            {url && (
                              <button
                                type="button"
                                onClick={() =>
                                  removerArquivoMoldura(index, tipo)
                                }
                                className="absolute top-2 right-2 z-20 p-2 rounded-xl bg-red-600 text-white shadow-lg hover:bg-red-700"
                                title="Excluir moldura"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                            {url ? (
                              <img
                                src={url}
                                className="w-full h-full object-contain p-2"
                                alt={tipo}
                              />
                            ) : (
                              <ImageIcon className="text-slate-300" size={32} />
                            )}
                            <label className="absolute inset-0 bg-blue-600/90 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all duration-300">
                                <input
                                  type="file"
                                  hidden
                                  accept="image/*"
                                  disabled={isUp}
                                  onChange={(e) =>
                                    handleUploadMoldura(e, index, tipo)
                                  }
                                />
                                {isUp ? (
                                  <Loader2
                                    className="animate-spin text-white"
                                    size={24}
                                  />
                                ) : (
                                  <>
                                    <Upload
                                      className="text-white mb-1"
                                      size={22}
                                    />
                                    <span className="text-white text-[9px] font-black uppercase tracking-tighter">
                                      {url ? "Trocar" : "Enviar"}
                                    </span>
                                  </>
                                )}
                            </label>
                          </div>
                          {url && (
                            <p className="mt-2 text-[9px] text-slate-400 font-medium text-center truncate w-full px-1">
                              ✓ Carregada
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ===== SEÇÃO 3: CORES ===== */}
          <section className="space-y-4">
            <SectionTitle
              icon={<Palette size={14} className="text-blue-500" />}
              label="Identidade Visual"
            />
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-3 gap-4">
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

        <footer className="p-6 border-t border-slate-100 flex gap-4 bg-slate-50 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-white text-slate-500 border border-slate-200 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-100 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={loading || isUploading}
            className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            {isUploading ? "Aguardando uploads..." : "Salvar Perfil"}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* --- AUXILIARES --- */

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado";
}

function getMoldurasStoragePath(url: string) {
  try {
    const marker = "/storage/v1/object/public/molduras/";
    const pathname = new URL(url).pathname;
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    return decodeURIComponent(pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

function SectionTitle({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
      {icon} {label}
    </h4>
  );
}

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

function InputField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">
        {label}
      </label>
      <input
        disabled={disabled}
        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700 disabled:opacity-50 disabled:bg-slate-100 transition-all text-sm"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
