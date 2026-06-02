"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  Lock,
  Unlock,
  Loader2,
  Save,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

export default function AdminColinhaVisual() {
  // Estados de Listagem
  const [candidatos, setCandidatos] = useState<any[]>([]);
  const [cargosSistema, setCargosSistema] = useState<any[]>([]);
  const [presidentes, setPresidentes] = useState<any[]>([]);

  // Estado do Filtro Ativo
  const [selectedCandidatoId, setSelectedCandidatoId] = useState<string>("");

  // Estados da Colinha Ativa
  const [config, setConfig] = useState<any>(null);
  const [travados, setTravados] = useState<any[]>([]);

  // Status de UI
  const [loadingListas, setLoadingListas] = useState(true);
  const [loadingColinha, setLoadingColinha] = useState(false);
  const [isSavingGeral, setIsSavingGeral] = useState(false);
  const [uploadingCargo, setUploadingCargo] = useState<string | null>(null);

  // 1. CARGA INICIAL
  useEffect(() => {
    async function carregarListasIniciais() {
      try {
        setLoadingListas(true);

        const [resCand, resCargos, resPres] = await Promise.all([
          supabase
            .from("candidatos")
            .select(
              "id, nome_urna, partido, numero_candidato, cargo_id, url_foto_perfil",
            )
            .order("nome_urna", { ascending: true }),
          supabase
            .from("cargos_politicos")
            .select("*")
            .order("ordem_votacao", { ascending: true }),
          supabase
            .from("presidenciados")
            .select("*")
            .order("nome", { ascending: true }),
        ]);

        if (resCargos.data) setCargosSistema(resCargos.data);
        if (resPres.data) setPresidentes(resPres.data);

        if (resCand.data && resCand.data.length > 0) {
          setCandidatos(resCand.data);
          setSelectedCandidatoId(resCand.data[0].id);
        }
      } catch (err) {
        console.error("Erro na carga inicial do admin:", err);
      } finally {
        setLoadingListas(false);
      }
    }
    carregarListasIniciais();
  }, []);

  // 2. MUDANÇA DE CANDIDATO
  useEffect(() => {
    if (!selectedCandidatoId) return;

    async function buscarColinhaDoCandidato() {
      setLoadingColinha(true);
      try {
        let { data: configData } = await supabase
          .from("colinha_config")
          .select("*")
          .eq("candidato_id", selectedCandidatoId)
          .maybeSingle();

        if (!configData) {
          const { data: novaConfig, error: errCriar } = await supabase
            .from("colinha_config")
            .insert({ candidato_id: selectedCandidatoId })
            .select()
            .single();

          if (errCriar) throw errCriar;
          configData = novaConfig;
        }

        setConfig(configData);

        if (configData) {
          const { data: travadosData } = await supabase
            .from("colinha_travados")
            .select("*")
            .eq("colinha_config_id", configData.id);

          setTravados(travadosData || []);
        }
      } catch (err) {
        console.error("Erro ao carregar colinha do candidato:", err);
      } finally {
        setLoadingColinha(false);
      }
    }

    buscarColinhaDoCandidato();
  }, [selectedCandidatoId]);

  // 3. ALTERNAR CADEADO (Local)
  const handleToggleTrancamento = (cargoObj: any) => {
    const existente = travados.find(
      (t) =>
        t.cargo_nome?.trim().toLowerCase() ===
        cargoObj.nome?.trim().toLowerCase(),
    );

    if (existente) {
      setTravados((prev) =>
        prev.filter(
          (t) => t.cargo_nome.toUpperCase() !== cargoObj.nome.toUpperCase(),
        ),
      );
    } else {
      const novoSlotLocal = {
        id: `temp-${Date.now()}`,
        colinha_config_id: config?.id,
        cargo_nome: cargoObj.nome,
        nome_urna: "",
        partido: candidatoSelecionadoObj?.partido || "",
        numero: "",
        status_foto: "sem_foto",
        url_foto: null,
      };
      setTravados((prev) => [...prev, novoSlotLocal]);
    }
  };

  // 4. MUDANÇA EM TEMPO REAL NOS INPUTS
  const handleModificarTextoParceiro = (
    cargoNome: string,
    campo: "nome_urna" | "numero",
    valor: string,
  ) => {
    setTravados((prev) =>
      prev.map((t) =>
        t.cargo_nome.toUpperCase() === cargoNome.toUpperCase()
          ? { ...t, [campo]: valor }
          : t,
      ),
    );
  };

  // 5. MANIPULAÇÃO LOCAL DO SELECT DE PRESIDENTE
  const handleLocalPresidenteChange = (idPres: string) => {
    setConfig((prev: any) => ({ ...prev, presidente_id: idPres || null }));
  };

  // 6. UPLOAD DE FOTO + ENVIAR PARA MODERAÇÃO
  const handleUploadFotoModeracao = async (cargoNome: string, file: File) => {
    if (!file || !config) return;

    setUploadingCargo(cargoNome);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${selectedCandidatoId}/${cargoNome.toLowerCase().replace(/\s+/g, "_")}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("parceiros_fotos")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("parceiros_fotos").getPublicUrl(fileName);

      setTravados((prev) =>
        prev.map((t) =>
          t.cargo_nome.toUpperCase() === cargoNome.toUpperCase()
            ? { ...t, url_foto: publicUrl, status_foto: "pendente" }
            : t,
        ),
      );
    } catch (err) {
      console.error("Erro no upload da foto do parceiro:", err);
      alert(
        "Falha ao subir imagem. Certifique-se de que o bucket 'parceiros_fotos' existe e está público.",
      );
    } finally {
      setUploadingCargo(null);
    }
  };

  // 7. SALVAR TUDO (PROCESSO EM LOTE)
  const handleSalvarTudo = async () => {
    if (!config) return;

    setIsSavingGeral(true);
    try {
      await supabase
        .from("colinha_config")
        .update({ presidente_id: config.presidente_id })
        .eq("id", config.id);

      const { data: dadosAtuaisBanco } = await supabase
        .from("colinha_travados")
        .select("id, cargo_nome")
        .eq("colinha_config_id", config.id);

      const itensBanco = dadosAtuaisBanco || [];

      const itensDeletar = itensBanco.filter(
        (b) =>
          !travados.some(
            (t) => t.cargo_nome.toUpperCase() === b.cargo_nome.toUpperCase(),
          ),
      );

      if (itensDeletar.length > 0) {
        await supabase
          .from("colinha_travados")
          .delete()
          .in(
            "id",
            itensDeletar.map((d) => d.id),
          );
      }

      const payloadsUpsert = travados.map((item) => {
        const correspondenteNoBanco = itensBanco.find(
          (b) => b.cargo_nome.toUpperCase() === item.cargo_nome.toUpperCase(),
        );

        return {
          ...(correspondenteNoBanco ? { id: correspondenteNoBanco.id } : {}),
          colinha_config_id: config.id,
          cargo_nome: item.cargo_nome,
          nome_urna: item.nome_urna || "Nome do Parceiro",
          partido: item.partido || candidatoSelecionadoObj?.partido || "---",
          numero: item.numero || "00",
          status_foto: item.status_foto || "sem_foto",
          url_foto: item.url_foto || null,
        };
      });

      if (payloadsUpsert.length > 0) {
        const { error: errUpsert } = await supabase
          .from("colinha_travados")
          .upsert(payloadsUpsert);

        if (errUpsert) throw errUpsert;
      }

      const { data: novaCargaTravados } = await supabase
        .from("colinha_travados")
        .select("*")
        .eq("colinha_config_id", config.id);

      setTravados(novaCargaTravados || []);
      alert(
        "Parabéns! Toda a estrutura da colinha foi salva com sucesso no banco de dados.",
      );
    } catch (err: any) {
      console.error("Erro no salvamento mestre:", err);
      alert(`Erro crítico ao salvar alterações gerais: ${err.message}`);
    } finally {
      setIsSavingGeral(false);
    }
  };

  const candidatoSelecionadoObj = candidatos.find(
    (c) => c.id === selectedCandidatoId,
  );

  if (loadingListas) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center gap-3 font-sans">
        <Loader2 className="animate-spin text-blue-600" size={24} />
        <span className="text-xs font-black uppercase tracking-widest text-slate-400">
          Iniciando Painel Admin Geral...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-900">
      {/* SIDEBAR */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 flex flex-col p-8 shrink-0">
        <h1 className="text-xl font-black uppercase tracking-tighter text-slate-800 mb-8">
          SIND <span className="text-blue-600">ADMIN</span>
        </h1>
        <nav className="space-y-2">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-4 w-full p-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
          >
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          <div className="flex items-center gap-4 w-full p-4 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-blue-600 text-white shadow-lg shadow-blue-100 cursor-default">
            <Lock size={18} /> Configurar Colinha
          </div>
        </nav>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* TOPO: SELETOR DE CANDIDATO */}
          <header className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">
                Customização por Candidato
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Selecione abaixo quem deseja gerenciar.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-2 rounded-2xl w-full sm:w-auto">
              <label className="block text-[7px] font-black uppercase tracking-widest text-slate-400 mb-0.5 px-1">
                Candidato Ativo:
              </label>
              <select
                value={selectedCandidatoId}
                onChange={(e) => setSelectedCandidatoId(e.target.value)}
                className="bg-transparent font-black text-xs text-blue-600 uppercase outline-none cursor-pointer w-full pr-4"
              >
                {candidatos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_urna} ({c.partido} - {c.numero_candidato})
                  </option>
                ))}
              </select>
            </div>
          </header>

          {/* COMPONENTE DA ESTRUTURA DOS SLOTS */}
          {loadingColinha ? (
            <div className="bg-white p-12 rounded-3xl border flex flex-col items-center justify-center gap-2 shadow-sm">
              <Loader2 className="animate-spin text-blue-600" size={28} />
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                Montando Slots do Banco...
              </span>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
              <div className="border-b pb-3 mb-2 flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Slots da Urna Eleitoral
                </h3>
                <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase">
                  Salvar necessário ao alterar
                </span>
              </div>

              {/* MUDANÇA CRUCIAL: Adicionado um .filter para ignorar o cargo de Presidente na lista dinâmica */}
              {cargosSistema
                .filter(
                  (cargo) => cargo.nome?.trim().toLowerCase() !== "presidente",
                )
                .map((cargo) => {
                  const isDonoDoSite =
                    candidatoSelecionadoObj &&
                    cargo.id === candidatoSelecionadoObj.cargo_id;
                  const travadoObj = travados.find(
                    (t) =>
                      t.cargo_nome.toUpperCase() === cargo.nome.toUpperCase(),
                  );
                  const isTravado = !!travadoObj;

                  return (
                    <div
                      key={cargo.id}
                      className={`p-4 rounded-2xl border flex flex-col space-y-4 transition-all ${
                        isDonoDoSite
                          ? "bg-emerald-50/40 border-emerald-200"
                          : isTravado
                            ? "bg-blue-50/40 border-blue-200 shadow-sm"
                            : "bg-slate-50/50 border-slate-200"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Botão de Trava/Cadeado */}
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            disabled={isDonoDoSite}
                            onClick={() => handleToggleTrancamento(cargo)}
                            className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
                              isDonoDoSite
                                ? "bg-emerald-600 text-white border-emerald-600 cursor-not-allowed"
                                : isTravado
                                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                                  : "bg-white text-slate-400 border-slate-200 hover:text-blue-600 hover:border-blue-200"
                            }`}
                          >
                            {isDonoDoSite || isTravado ? (
                              <Lock size={14} />
                            ) : (
                              <Unlock size={14} />
                            )}
                          </button>

                          <div>
                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">
                              {cargo.nome}
                            </span>
                            <span className="font-bold text-xs uppercase text-slate-700">
                              {isDonoDoSite
                                ? "Candidato do Site"
                                : isTravado
                                  ? "Slot Trancado"
                                  : "Livre (Eleitor Digita)"}
                            </span>
                          </div>
                        </div>

                        {/* Inputs de customização do parceiro */}
                        <div className="flex gap-3 max-w-xs flex-1">
                          <div className="w-1/2">
                            <label className="block text-[7px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                              Nome Urna
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: João Silva"
                              disabled={isDonoDoSite || !isTravado}
                              value={
                                isDonoDoSite
                                  ? candidatoSelecionadoObj.nome_urna
                                  : isTravado
                                    ? travadoObj.nome_urna
                                    : ""
                              }
                              onChange={(e) =>
                                handleModificarTextoParceiro(
                                  cargo.nome,
                                  "nome_urna",
                                  e.target.value,
                                )
                              }
                              className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-bold uppercase outline-none focus:border-blue-500 disabled:bg-slate-100/60 disabled:text-slate-400 border-slate-200"
                            />
                          </div>
                          <div className="w-1/2">
                            <label className="block text-[7px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                              Número
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: 40123"
                              maxLength={cargo.digitos || 5}
                              disabled={isDonoDoSite || !isTravado}
                              value={
                                isDonoDoSite
                                  ? candidatoSelecionadoObj.numero_candidato
                                  : isTravado
                                    ? travadoObj.numero
                                    : ""
                              }
                              onChange={(e) =>
                                handleModificarTextoParceiro(
                                  cargo.nome,
                                  "numero",
                                  e.target.value.replace(/\D/g, ""),
                                )
                              }
                              className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-mono font-black text-blue-600 tracking-widest outline-none focus:border-blue-500 disabled:bg-slate-100/60 disabled:text-slate-400 border-slate-200"
                            />
                          </div>
                        </div>
                      </div>

                      {/* FLUXO DE MODERAÇÃO DE FOTO */}
                      {isTravado && !isDonoDoSite && (
                        <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/50 p-3 rounded-xl">
                          <div className="flex items-center gap-3">
                            <label className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider px-3 py-2 rounded-lg flex items-center gap-2 transition-all active:scale-95">
                              {uploadingCargo === cargo.nome ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Upload size={12} />
                              )}
                              Enviar Foto Parceiro
                              <input
                                type="file"
                                accept="image/*"
                                disabled={uploadingCargo === cargo.nome}
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleUploadFotoModeracao(
                                      cargo.nome,
                                      e.target.files[0],
                                    );
                                  }
                                }}
                              />
                            </label>

                            {travadoObj.url_foto && (
                              <img
                                src={travadoObj.url_foto}
                                alt="Preview"
                                className="w-8 h-8 rounded-full object-cover border border-slate-300 shadow-inner"
                              />
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider">
                            {travadoObj.status_foto === "aprovado" && (
                              <span className="text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 size={13} /> Publicado na Colinha
                              </span>
                            )}
                            {travadoObj.status_foto === "pendente" && (
                              <span className="text-amber-600 flex items-center gap-1 animate-pulse">
                                <Clock size={13} /> Em Moderação
                              </span>
                            )}
                            {(travadoObj.status_foto === "sem_foto" ||
                              !travadoObj.status_foto) && (
                              <span className="text-slate-400 flex items-center gap-1">
                                <AlertCircle size={13} /> Sem Foto (Apenas
                                Texto)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* SLOT EXTRA FIXO: PRESIDENTE DA REPUBLICA (Único local onde deve aparecer) */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
                <div>
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">
                    Cargo Majoritário Nacional
                  </span>
                  <span className="font-bold text-xs uppercase text-slate-700">
                    Presidente da República
                  </span>
                </div>

                <div className="w-full sm:w-52">
                  <label className="block text-[7px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                    Vincular Parceiro:
                  </label>
                  <select
                    value={config?.presidente_id || ""}
                    onChange={(e) =>
                      handleLocalPresidenteChange(e.target.value)
                    }
                    className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs font-bold uppercase text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="">
                      -- Deixar Livre (Eleitor Digita) --
                    </option>
                    {presidentes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p.partido} - {p.numero})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* BARRA DE SALVAMENTO EXPANSIVA GERAL */}
              <div className="pt-4 border-t flex justify-end">
                <button
                  type="button"
                  onClick={handleSalvarTudo}
                  disabled={isSavingGeral}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest px-6 py-4 rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:bg-slate-300"
                >
                  {isSavingGeral ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Gravando Configurações...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Salvar Configurações da Colinha
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
