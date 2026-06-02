"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import PhotoUpload from "./PhotoUpload";
import LeadForm from "./LeadForm";
import { supabase } from "@/lib/supabase";
import { Layout, Square } from "lucide-react";

interface CanvasEditorProps {
  candidatoId: string;
  nome_urna: string;
  url_moldura?: string;
  url_moldura_feed?: string;
  corPrimaria?: string;
  theme?: Record<string, unknown>;
}

interface LeadData {
  nome: string;
  whatsapp: string;
  lgpd_consent: boolean;
  consent_version: string;
}

function loadImage(
  src: string,
  crossOrigin?: string,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("FileReader falhou"));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CanvasEditor({
  candidatoId,
  nome_urna,
  url_moldura = "",
  url_moldura_feed = "",
}: CanvasEditorProps) {
  const [format, setFormat] = useState<"stories" | "feed">("stories");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const userImgRef = useRef<HTMLImageElement | null>(null);
  const frameImgRef = useRef<HTMLImageElement | null>(null);
  const lastFrameUrl = useRef("");
  const pinchRef = useRef({ active: false, lastDist: 0, lastZoom: 1 });

  const activeFrame =
    format === "stories" ? url_moldura : url_moldura_feed || url_moldura;

  // =========================
  // DRAW
  // =========================
  const drawCanvas = useCallback(
    (
      userImg: HTMLImageElement,
      frameImg: HTMLImageElement | null,
      fmt: "stories" | "feed",
      z: number,
      off: { x: number; y: number },
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const W = 1080;
      const H = fmt === "stories" ? 1920 : 1080;

      canvas.width = W;
      canvas.height = H;
      ctx.clearRect(0, 0, W, H);

      ctx.save();
      ctx.translate(W / 2 + off.x, H / 2 + off.y);
      ctx.scale(z, z);
      const scale = Math.max(
        W / userImg.naturalWidth,
        H / userImg.naturalHeight,
      );
      ctx.drawImage(
        userImg,
        -(userImg.naturalWidth * scale) / 2,
        -(userImg.naturalHeight * scale) / 2,
        userImg.naturalWidth * scale,
        userImg.naturalHeight * scale,
      );
      ctx.restore();

      if (frameImg) {
        const s = Math.max(
          W / frameImg.naturalWidth,
          H / frameImg.naturalHeight,
        );
        ctx.drawImage(
          frameImg,
          (W - frameImg.naturalWidth * s) / 2,
          (H - frameImg.naturalHeight * s) / 2,
          frameImg.naturalWidth * s,
          frameImg.naturalHeight * s,
        );
      }
    },
    [],
  );

  useEffect(() => {
    if (userImgRef.current && hasPhoto) {
      drawCanvas(userImgRef.current, frameImgRef.current, format, zoom, offset);
    }
  }, [zoom, offset, format, hasPhoto, drawCanvas]);

  useEffect(() => {
    if (!activeFrame) {
      frameImgRef.current = null;
      return;
    }
    if (lastFrameUrl.current === activeFrame && frameImgRef.current) return;
    lastFrameUrl.current = activeFrame;

    loadImage(`${activeFrame}?cb=${Date.now()}`, "anonymous")
      .then((img) => {
        frameImgRef.current = img;
        if (userImgRef.current && hasPhoto) {
          drawCanvas(userImgRef.current, img, format, zoom, offset);
        }
      })
      .catch(() => {
        loadImage(activeFrame, "anonymous")
          .then((img) => {
            frameImgRef.current = img;
          })
          .catch(() => {
            frameImgRef.current = null;
          });
      });
  }, [activeFrame]); // eslint-disable-line react-hooks/exhaustive-deps

  // =========================
  // SELECIONA FOTO
  // =========================
  const handleImageSelect = useCallback(
    async (file: File) => {
      setIsLoading(true);
      try {
        const dataUrl = await fileToDataUrl(file);
        const img = await loadImage(dataUrl);
        userImgRef.current = img;
        setHasPhoto(true);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            drawCanvas(img, frameImgRef.current, format, zoom, offset);
            setIsLoading(false);
          });
        });
      } catch (err) {
        console.error("Erro ao carregar foto:", err);
        alert("Não foi possível carregar a foto. Tente novamente.");
        setIsLoading(false);
      }
    },
    [drawCanvas, format, zoom, offset],
  );

  // =========================
  // DRAG + PINCH
  // =========================
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    if ("touches" in e)
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    if (!hasPhoto) return;
    if ("touches" in e && e.touches.length === 2) return;
    setIsDragging(true);
    setLastPos(getPos(e));
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if ("touches" in e) e.preventDefault();

    if ("touches" in e && e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

      if (!pinchRef.current.active) {
        pinchRef.current = { active: true, lastDist: dist, lastZoom: zoom };
        setIsDragging(false);
        return;
      }

      const delta = dist / pinchRef.current.lastDist;
      const newZoom = Math.min(
        3,
        Math.max(0.5, pinchRef.current.lastZoom * delta),
      );
      pinchRef.current.lastDist = dist;
      pinchRef.current.lastZoom = newZoom;
      setZoom(newZoom);
      return;
    }

    if ("touches" in e && e.touches.length < 2) {
      pinchRef.current.active = false;
    }

    if (!isDragging) return;
    const p = getPos(e);
    setOffset((prev) => ({
      x: prev.x + (p.x - lastPos.x) * 2.5,
      y: prev.y + (p.y - lastPos.y) * 2.5,
    }));
    setLastPos(p);
  };

  const end = (e: React.TouchEvent | React.MouseEvent) => {
    if ("touches" in e && e.touches.length < 2) {
      pinchRef.current.active = false;
    }
    setIsDragging(false);
  };

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // =========================
  // DOWNLOAD
  // =========================
  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${nome_urna}-foto.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [nome_urna]);

  // =========================
  // SHARE — mobile: gaveta nativa | desktop: WhatsApp Web
  // Incrementa stats_shares após compartilhar
  // =========================
  const share = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isSharing) return;
    setIsSharing(true);

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("Erro ao gerar imagem");

      const file = new File([blob], `${nome_urna}-foto.png`, {
        type: "image/png",
      });
      const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

      // URL atual da página — funciona em dev e produção
      const urlAtual =
        typeof window !== "undefined" ? window.location.href : "";
      const texto = `Apoio ${nome_urna}! Crie a sua foto também 🗳️\n${urlAtual}`;

      if (
        isMobile &&
        typeof navigator.share === "function" &&
        navigator.canShare?.({ files: [file] })
      ) {
        // Mobile: gaveta nativa com arquivo
        await navigator.share({
          files: [file],
          title: `Foto ${nome_urna}`,
          text: texto,
        });
      } else {
        // Desktop: abre WhatsApp Web com texto + link
        window.open(
          `https://web.whatsapp.com/send?text=${encodeURIComponent(texto)}`,
          "_blank",
        );
      }

      // Incrementa contador de compartilhamentos
      supabase
        .rpc("increment_shares_count", { slug_candidato: candidatoId })
        .then(({ error }) => {
          if (error)
            console.error("Erro ao incrementar shares:", error.message);
        });
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error(err);
      }
    }

    setIsSharing(false);
  };

  // =========================
  // SUBMIT — salva lead + incrementa contador de fotos geradas
  // =========================
  const handleSubmit = async (data: LeadData) => {
    if (!canvasRef.current || !hasPhoto) return;

    // Salva o lead
    const { error: leadError } = await supabase.from("leads").insert([
      {
        nome: data.nome,
        whatsapp: data.whatsapp,
        lgpd_consent: data.lgpd_consent,
        consent_version: data.consent_version,
        candidato_slug: candidatoId,
      },
    ]);

    if (leadError) {
      console.error("Erro ao salvar lead:", leadError.message);
      throw leadError; // LeadForm trata e exibe mensagem de erro
    }

    // Incrementa contador de fotos geradas (stats_leads_count)
    supabase
      .rpc("increment_leads_count", { slug_candidato: candidatoId })
      .then(({ error }) => {
        if (error)
          console.error("Erro ao incrementar leads count:", error.message);
      });

    // Habilita botões — sem download automático
    setIsSubmitted(true);
  };

  return (
    <div className="flex flex-col gap-6 max-w-85 mx-auto">
      {/* FORMAT */}
      <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
        <button
          onClick={() => {
            setFormat("stories");
            reset();
          }}
          className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${
            format === "stories" ? "bg-white shadow" : "text-gray-400"
          }`}
        >
          <Layout size={14} /> Stories
        </button>
        <button
          onClick={() => {
            setFormat("feed");
            reset();
          }}
          className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${
            format === "feed" ? "bg-white shadow" : "text-gray-400"
          }`}
        >
          <Square size={14} /> Feed
        </button>
      </div>

      {/* CANVAS AREA */}
      <div
        className={`relative w-full rounded-3xl overflow-hidden bg-gray-200 select-none ${
          format === "stories" ? "aspect-[9/16]" : "aspect-square"
        }`}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        style={{ touchAction: "none" }}
      >
        {!hasPhoto && activeFrame && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeFrame}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            alt=""
          />
        )}

        {!hasPhoto && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className="text-white text-xs font-bold drop-shadow text-center px-4">
              Toque para adicionar sua foto
            </span>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
            <span className="text-white text-sm font-semibold">
              Carregando...
            </span>
          </div>
        )}

        {!hasPhoto && !isLoading && (
          <PhotoUpload onImageSelect={handleImageSelect} />
        )}

        {hasPhoto && <canvas ref={canvasRef} className="w-full h-full" />}

        {hasPhoto && <PinchHint />}
      </div>

      {/* CONTROLES */}
      {hasPhoto && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl shadow border space-y-4">
            <label className="block text-xs text-gray-500 font-medium">
              Zoom
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full mt-1"
                aria-label="Zoom da foto"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={reset} className="py-2 rounded border text-sm">
                Resetar
              </button>
              <button
                onClick={() => {
                  userImgRef.current = null;
                  setHasPhoto(false);
                  reset();
                  setIsSubmitted(false);
                }}
                className="py-2 rounded bg-red-100 text-red-600 text-sm"
              >
                Trocar foto
              </button>
            </div>
          </div>

          {!isSubmitted && (
            <LeadForm onSubmit={handleSubmit} nome_urna={nome_urna} />
          )}

          {isSubmitted && (
            <div className="flex flex-col gap-3">
              <p className="text-center text-xs text-slate-500 font-medium">
                Sua foto está pronta! Escolha o que fazer:
              </p>
              <button
                onClick={download}
                className="bg-blue-600 text-white p-3 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
              >
                ⬇️ Baixar Foto
              </button>
              <button
                onClick={share}
                disabled={isSharing}
                className="bg-green-500 text-white p-3 rounded-xl text-sm font-semibold disabled:opacity-60 active:scale-95 transition-transform"
              >
                {isSharing ? "Abrindo..." : "💬 Compartilhar no WhatsApp"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PinchHint() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none z-10">
      <span className="bg-black/50 text-white text-[10px] font-semibold px-3 py-1 rounded-full backdrop-blur-sm">
        Pinça para zoom · Arraste para mover
      </span>
    </div>
  );
}
