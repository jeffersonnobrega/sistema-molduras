"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  STORAGE_IMAGE_ACCEPT,
  validateStorageImage,
} from "@/lib/storage-image";
import {
  LayoutDashboard,
  Users,
  Lock,
  Unlock,
  Loader2,
  Save,
  Image as ImageIcon,
  Upload,
  Trash2,
  LogOut,
} from "lucide-react";
import Link from "next/link";

export default function AdminColinhaVisual() {
  const [candidatos, setCandidatos] = useState<any[]>([]);
  const [cargosSistema, setCargosSistema] = useState<any[]>([]);
  const [presidentes, setPresidentes] = useState<any[]>([]);
  const [selectedCandidatoId, setSelectedCandidatoId] = useState<string>("");
  const [config, setConfig] = useState<any>(null);
  const [travados, setTravados] = useState<any[]>([]);
  const [loadingListas, setLoadingListas] = useState(true);
  const [loadingColinha, setLoadingColinha] = useState(false);
  const [isSavingGeral, setIsSavingGeral] = useState(false);
  const [uploadingFotoCargo, setUploadingFotoCargo] = useState<string | null>(
    null,
  );
  useEffect(() => {
    async function carregarListasIniciais() {
      try {
        setLoadingListas(true);

        const [resCand, resCargos, resPres] = await Promise.all([
          supabase
            .from("candidatos")
            .select(
              "id, slug, nome_urna, partido, numero_candidato, cargo_id, url_foto_perfil",
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
        id: crypto.randomUUID(),
        colinha_config_id: config?.id,
        cargo_nome: cargoObj.nome,
        nome_urna: "",
        partido: candidatoSelecionadoObj?.partido || "",
        numero: "",
        url_foto: null,
        status_foto: "sem_foto",
      };
      setTravados((prev) => [...prev, novoSlotLocal]);
    }
  };
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

  const handleUploadFotoGovernador = async (
    cargoNome: string,
    file: File,
  ) => {
    if (!candidatoSelecionadoObj?.slug) {
      alert("Não foi possível identificar a pasta do candidato.");
      return;
    }

    const validation = validateStorageImage(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setUploadingFotoCargo(cargoNome);
    try {
      const nomeCargoSeguro = cargoNome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const caminho = `${candidatoSelecionadoObj.slug}/colinha/${nomeCargoSeguro}-${Date.now()}.${validation.extension}`;
      const { error } = await supabase.storage
        .from("molduras")
        .upload(caminho, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });
      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("molduras").getPublicUrl(caminho);

      setTravados((prev) =>
        prev.map((item) =>
          item.cargo_nome.toUpperCase() === cargoNome.toUpperCase()
            ? {
                ...item,
                url_foto: publicUrl,
                status_foto: "aprovada",
              }
            : item,
        ),
      );
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : "Erro desconhecido";
      console.error("Erro ao enviar foto do governador:", err);
      alert(`Erro ao enviar a foto: ${mensagem}`);
    } finally {
      setUploadingFotoCargo(null);
    }
  };

  const handleRemoverFotoGovernador = (cargoNome: string) => {
    setTravados((prev) =>
      prev.map((item) =>
        item.cargo_nome.toUpperCase() === cargoNome.toUpperCase()
          ? { ...item, url_foto: null, status_foto: "sem_foto" }
          : item,
      ),
    );
  };
  const handleLocalPresidenteChange = (idPres: string) => {
    setConfig((prev: any) => ({ ...prev, presidente_id: idPres || null }));
  };
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
          id: correspondenteNoBanco?.id || item.id,
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
      alert("Toda a estrutura da colinha foi salva com sucesso!");
    } catch (err: any) {
      console.error("Erro no salvamento mestre:", err);
      alert(`Erro crítico ao salvar alterações: ${err.message}`);
    } finally {
      setIsSavingGeral(false);
    }
  };

  const candidatoSelecionadoObj = candidatos.find(
    (c) => c.id === selectedCandidatoId,
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

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
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 flex flex-col p-8 shrink-0 md:h-screen md:sticky md:top-0">
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

          <Link
            href="/admin/dashboard?tab=leads"
            className="flex items-center gap-4 w-full p-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
          >
            <Users size={18} /> Base de Leads
          </Link>

          <div className="flex items-center gap-4 w-full p-4 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-blue-600 text-white shadow-lg shadow-blue-100 cursor-default">
            <Lock size={18} /> Configurar Colinha
          </div>
        </nav>

        <div className="flex-1" />

        <div className="mt-8 border-t border-slate-100 pt-4">
          <button
            type="button"
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

      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
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

              {cargosSistema
                .filter(
                  (cargo) => cargo.nome?.trim().toLowerCase() !== "presidente",
                )
                .map((cargo) => {
                  const isGovernador =
                    cargo.nome?.trim().toLowerCase() === "governador";
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
                              placeholder={"0".repeat(cargo.digitos || 5)}
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

                      {isGovernador && !isDonoDoSite && (
                          <div className="flex flex-col gap-3 border-t border-blue-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
                                {travadoObj?.url_foto ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={travadoObj.url_foto}
                                    alt={`Foto de ${travadoObj.nome_urna || "governador"}`}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <ImageIcon
                                    size={18}
                                    className="text-slate-300"
                                  />
                                )}
                              </div>

                              <div className="min-w-0">
                                <span className="block text-[8px] font-black uppercase tracking-wider text-slate-400">
                                  Foto opcional do governador
                                </span>
                                <span className="block truncate text-[10px] font-bold text-slate-600">
                                  {isTravado
                                    ? "Só será exibida na colinha quando houver foto."
                                    : "Trave o slot de Governador para enviar a foto."}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <label
                                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-600 transition hover:border-blue-300 hover:text-blue-600 ${
                                  uploadingFotoCargo === cargo.nome
                                    ? "pointer-events-none opacity-50"
                                    : !isTravado
                                      ? "pointer-events-none opacity-40"
                                    : ""
                                }`}
                              >
                                {uploadingFotoCargo === cargo.nome ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Upload size={13} />
                                )}
                                {uploadingFotoCargo === cargo.nome
                                  ? "Enviando"
                                  : travadoObj?.url_foto
                                    ? "Trocar foto"
                                    : isTravado
                                      ? "Enviar foto"
                                      : "Trave para enviar"}
                                <input
                                  type="file"
                                  accept={STORAGE_IMAGE_ACCEPT}
                                  className="hidden"
                                  disabled={
                                    !isTravado ||
                                    uploadingFotoCargo === cargo.nome
                                  }
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    event.target.value = "";
                                    if (file) {
                                      void handleUploadFotoGovernador(
                                        cargo.nome,
                                        file,
                                      );
                                    }
                                  }}
                                />
                              </label>

                              {travadoObj?.url_foto && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoverFotoGovernador(cargo.nome)
                                  }
                                  disabled={uploadingFotoCargo === cargo.nome}
                                  className="rounded-xl border border-red-100 bg-white p-2.5 text-red-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                  aria-label="Remover foto do governador"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                    </div>
                  );
                })}

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
