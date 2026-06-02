"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { toPng } from "html-to-image";
import { CheckCircle2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CandidatoData {
  id: string;
  nome_urna: string;
  numero_candidato: string;
  url_foto_perfil: string;
  cargo_travado_id: string;
  partido: string;
}

interface ColinhaProps {
  candidatoData: CandidatoData;
  config: {
    tipo_regional: "Deputado Estadual" | "Deputado Distrital";
    lead_id?: string;
  };
  theme: any;
  partido: string;
}

export default function CandidatoColinha({
  candidatoData,
  config,
  theme,
  partido,
}: ColinhaProps) {
  const colinhaRef = useRef<HTMLDivElement>(null);

  const [cargos, setCargos] = useState<any[]>([]);
  const [valoresDigitados, setValoresDigitados] = useState<{
    [key: string]: string;
  }>({});
  const [nomesDigitados, setNomesDigitados] = useState<{
    [key: string]: string;
  }>({});
  const [itensTravados, setItensTravados] = useState<any[]>([]);
  const [presidenteData, setPresidenteData] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const carregarColinhaRelacional = useCallback(async () => {
    try {
      setIsLoading(true);

      const { data: listCargos, error: errCargos } = await supabase
        .from("cargos_politicos")
        .select("*")
        .order("ordem_votacao", { ascending: true });

      if (errCargos) throw errCargos;

      const cargosFiltrados = (listCargos || []).filter((c) => {
        if (
          config.tipo_regional === "Deputado Distrital" &&
          c.nome === "Deputado Estadual"
        )
          return false;
        if (
          config.tipo_regional === "Deputado Estadual" &&
          c.nome === "Deputado Distrital"
        )
          return false;
        return true;
      });
      setCargos(cargosFiltrados);

      const { data: configData } = await supabase
        .from("colinha_config")
        .select("*")
        .eq("candidato_id", candidatoData.id)
        .maybeSingle();

      if (configData) {
        const { data: travadosData } = await supabase
          .from("colinha_travados")
          .select("*")
          .eq("colinha_config_id", configData.id);
        if (travadosData) setItensTravados(travadosData);

        if (configData.presidente_id) {
          const { data: pres } = await supabase
            .from("presidenciados")
            .select("*")
            .eq("id", configData.presidente_id)
            .maybeSingle();
          if (pres) setPresidenteData(pres);
        }
      }
    } catch (err) {
      console.error("Erro ao estruturar colinha relacional:", err);
    } finally {
      setIsLoading(false);
    }
  }, [config.tipo_regional, candidatoData.id]);

  useEffect(() => {
    carregarColinhaRelacional();
  }, [carregarColinhaRelacional]);

  const handleChange = (cargoId: string, val: string, maxDigitos: number) => {
    const apenasNumeros = val.replace(/\D/g, "").slice(0, maxDigitos);
    setValoresDigitados((prev) => ({ ...prev, [cargoId]: apenasNumeros }));
  };

  const handleNomeChange = (cargoId: string, val: string) => {
    setNomesDigitados((prev) => ({ ...prev, [cargoId]: val }));
  };

  // =========================
  // Gera o PNG da colinha (usado por download e share)
  // =========================
  const gerarPng = async (): Promise<string> => {
    if (!colinhaRef.current) throw new Error("Ref não disponível");
    return toPng(colinhaRef.current, { pixelRatio: 2, cacheBust: true });
  };

  const salvarDadosColinha = async (dataUrl: string) => {
    if (!config.lead_id) return;

    const pegarNumeroFinal = (nomeCargo: string) => {
      const c = cargos.find(
        (item) => item.nome.toUpperCase() === nomeCargo.toUpperCase(),
      );
      if (!c) return null;
      if (c.id === candidatoData.cargo_travado_id)
        return candidatoData.numero_candidato;
      const travado = itensTravados.find(
        (t) => t.cargo_nome.toUpperCase() === nomeCargo.toUpperCase(),
      );
      if (travado) return travado.numero;
      return valoresDigitados[c.id] || null;
    };

    await supabase.from("colinhas_salvas").insert([
      {
        lead_id: config.lead_id,
        candidato_original_id: candidatoData.id,
        num_dep_federal: pegarNumeroFinal("Deputado Federal"),
        num_dep_estadual_distrital:
          config.tipo_regional === "Deputado Distrital"
            ? pegarNumeroFinal("Deputado Distrital")
            : pegarNumeroFinal("Deputado Estadual"),
        num_senador_1: pegarNumeroFinal("Senador - Vaga 1"),
        num_senador_2: pegarNumeroFinal("Senador - Vaga 2"),
        num_governador: pegarNumeroFinal("Governador"),
        num_presidente: presidenteData
          ? presidenteData.numero
          : valoresDigitados[
              cargos.find((c) => c.nome.toUpperCase() === "PRESIDENTE")?.id
            ] || null,
      },
    ]);

    await supabase.rpc("increment_colinha_download", {
      slug_candidato: candidatoData.id,
    });
  };

  // =========================
  // DOWNLOAD
  // =========================
  const handleExport = async () => {
    if (!colinhaRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await gerarPng();
      const link = document.createElement("a");
      link.download = `colinha-${candidatoData.nome_urna.toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
      await salvarDadosColinha(dataUrl);
    } catch (err) {
      console.error("Erro na exportação:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // =========================
  // SHARE — mesma regra do CanvasEditor
  // Mobile: gaveta nativa | Desktop: WhatsApp Web com link
  // Sem contabilização de stats
  // =========================
  const handleShare = async () => {
    if (!colinhaRef.current || isSharing) return;
    setIsSharing(true);

    try {
      const dataUrl = await gerarPng();

      // Converte dataUrl em Blob/File para o Web Share API
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File(
        [blob],
        `colinha-${candidatoData.nome_urna.toLowerCase()}.png`,
        {
          type: "image/png",
        },
      );

      const urlAtual =
        typeof window !== "undefined" ? window.location.href : "";
      const texto = `Minha colinha eleitoral para ${candidatoData.nome_urna}! Monte a sua também 🗳️\n${urlAtual}`;

      const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

      if (
        isMobile &&
        typeof navigator.share === "function" &&
        navigator.canShare?.({ files: [file] })
      ) {
        // Mobile: abre gaveta nativa com a imagem
        await navigator.share({
          files: [file],
          title: "Minha Colinha",
          text: texto,
        });
      } else {
        // Desktop: abre WhatsApp Web com texto + link
        window.open(
          `https://web.whatsapp.com/send?text=${encodeURIComponent(texto)}`,
          "_blank",
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Erro ao compartilhar colinha:", err);
      }
    } finally {
      setIsSharing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center text-xs p-10 animate-pulse text-slate-400 font-bold uppercase tracking-widest">
        Buscando dados relacionais...
      </div>
    );
  }

  return (
    <div className="w-full max-w-[360px] mx-auto space-y-4 font-sans text-slate-900">
      <div
        ref={colinhaRef}
        className="bg-white border-2 border-dashed rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden"
        style={{ borderColor: theme.containerBorder || "#e2e8f0" }}
      >
        <header className="mb-6 relative z-10">
          <h3
            className="text-[11px] font-black uppercase tracking-[0.3em] mb-1"
            style={{ color: theme.controls?.label || "#475569" }}
          >
            Minha Colinha
          </h3>
          <div
            className="h-1 w-8 rounded-full"
            style={{ backgroundColor: theme.controls?.value || "#2563eb" }}
          />
        </header>

        <div className="space-y-4 relative z-10">
          {cargos.map((cargo) => {
            const isDonoPagina =
              cargo.id === candidatoData.cargo_travado_id ||
              cargo.nome.toUpperCase() === "DEPUTADO FEDERAL";

            const parceiro = itensTravados.find(
              (t) => t.cargo_nome.toUpperCase() === cargo.nome.toUpperCase(),
            );
            const isTravadoPeloAdmin = !!parceiro;
            const isLocked = isDonoPagina || isTravadoPeloAdmin;
            const placeholderText = "0".repeat(cargo.digitos);

            const numeroExibido = isDonoPagina
              ? candidatoData.numero_candidato
              : isTravadoPeloAdmin
                ? parceiro.numero
                : valoresDigitados[cargo.id] || "";
            const nomeExibido = isDonoPagina
              ? candidatoData.nome_urna
              : isTravadoPeloAdmin
                ? parceiro.nome_urna
                : nomesDigitados[cargo.id] || "";
            const fotoExibida = isDonoPagina
              ? candidatoData.url_foto_perfil
              : isTravadoPeloAdmin
                ? parceiro.url_foto
                : null;

            return (
              <div
                key={cargo.id}
                className={`flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0 ${
                  isLocked
                    ? "bg-slate-50/70 p-2.5 -mx-2 rounded-2xl border-b-0 shadow-sm"
                    : ""
                }`}
              >
                <div className="flex justify-between items-center">
                  <label
                    className={`text-[9px] font-black uppercase tracking-wider ${isLocked ? "text-blue-600" : "text-slate-400"}`}
                  >
                    {cargo.nome}
                    {isLocked && (
                      <CheckCircle2
                        size={9}
                        className="inline mb-0.5 ml-1 text-blue-500"
                      />
                    )}
                  </label>
                  {!isLocked && (
                    <span className="text-[8px] text-slate-300 font-bold uppercase">
                      {cargo.digitos} dígitos
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3">
                  {isLocked ? (
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="text-xl font-mono font-black tracking-[0.2em] bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-800">
                        {numeroExibido}
                      </span>
                      <div className="flex items-center gap-2 max-w-[160px] justify-end truncate">
                        <span className="text-[11px] font-black text-slate-700 text-right uppercase block truncate">
                          {nomeExibido}
                        </span>
                        <div className="w-7 h-7 bg-white border border-slate-200 rounded-full overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                          {fotoExibida ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={fotoExibida}
                              className="w-full h-full object-cover"
                              alt=""
                            />
                          ) : (
                            <ImageIcon size={10} className="text-slate-300" />
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full gap-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder={placeholderText}
                        value={valoresDigitados[cargo.id] || ""}
                        onChange={(e) =>
                          handleChange(cargo.id, e.target.value, cargo.digitos)
                        }
                        className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xl font-mono font-black tracking-[0.2em] outline-none"
                        style={{ color: theme.controls?.value || "#2563eb" }}
                      />
                      <input
                        type="text"
                        placeholder="Nome do Candidato"
                        value={nomesDigitados[cargo.id] || ""}
                        onChange={(e) =>
                          handleNomeChange(cargo.id, e.target.value)
                        }
                        className="flex-1 min-w-0 bg-transparent border-b border-slate-200 focus:border-slate-400 px-1 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700 outline-none placeholder:text-slate-300 placeholder:normal-case placeholder:font-normal"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {presidenteData && (
            <div className="flex flex-col gap-1 bg-slate-50/70 p-2.5 -mx-2 rounded-2xl shadow-sm">
              <label className="text-[9px] font-black uppercase tracking-wider text-blue-600">
                PRESIDENTE{" "}
                <CheckCircle2
                  size={9}
                  className="inline mb-0.5 ml-1 text-blue-500"
                />
              </label>
              <div className="flex items-center justify-between w-full gap-2">
                <span className="text-xl font-mono font-black tracking-[0.2em] bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-800">
                  {presidenteData.numero}
                </span>
                <div className="flex items-center gap-2 max-w-[160px] justify-end truncate">
                  <span className="text-[11px] font-black text-slate-700 text-right uppercase block truncate">
                    {presidenteData.nome}
                  </span>
                  <div className="w-7 h-7 bg-white border border-slate-200 rounded-full overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                    {presidenteData.url_foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={presidenteData.url_foto}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : (
                      <ImageIcon size={10} className="text-slate-300" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTÕES */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleExport}
          disabled={isExporting || isSharing}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all bg-slate-900 text-white font-black uppercase text-xs tracking-widest hover:bg-black disabled:opacity-50 active:scale-95"
        >
          {isExporting ? "Gerando Imagem..." : "⬇️ Salvar Colinha"}
        </button>

        <button
          onClick={handleShare}
          disabled={isSharing || isExporting}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all bg-green-500 text-white font-black uppercase text-xs tracking-widest hover:bg-green-600 disabled:opacity-50 active:scale-95"
        >
          {isSharing ? "Abrindo..." : "💬 Compartilhar no WhatsApp"}
        </button>
      </div>
    </div>
  );
}
