"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import PhotoUpload from "./PhotoUpload";
import LeadForm from "./LeadForm";
import { Layout, Square, UserSquare2 } from "lucide-react";
import { createRequestId, recordPublicEvent } from "@/lib/public-events";

interface MolduraSet {
  label: string;
  stories: string;
  feed: string;
  perfil?: string;
}

interface CanvasEditorProps {
  candidatoId: string;
  nome_urna: string;
  molduras: MolduraSet[];
  corPrimaria?: string;
  theme?: Record<string, unknown>;
}

interface LeadData {
  nome: string;
  whatsapp: string;
  lgpd_consent: boolean;
  consent_version: string;
  turnstile_token: string;
}

interface FrameDimensions {
  width: number;
  height: number;
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

function toCssAspectRatio(w: number, h: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(w, h);
  return `${w / d}/${h / d}`;
}

const isMobileDevice = () =>
  typeof navigator !== "undefined" &&
  /Android|iPhone|iPad/i.test(navigator.userAgent);

async function saveOrDownload(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function shareImage(
  blob: Blob,
  filename: string,
  text: string,
): Promise<void> {
  const file = new File([blob], filename, { type: "image/png" });
  if (
    isMobileDevice() &&
    typeof navigator.share === "function" &&
    navigator.canShare?.({ files: [file] })
  ) {
    await navigator.share({ files: [file], title: filename, text });
    return;
  }
  window.open(
    `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`,
    "_blank",
  );
}

export default function CanvasEditor({
  candidatoId,
  nome_urna,
  molduras,
  corPrimaria = "#2563eb",
}: CanvasEditorProps) {
  const [format, setFormat] = useState<"stories" | "feed" | "perfil">(
    "stories",
  );
  const [molduraIndex, setMolduraIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [dimsMap, setDimsMap] = useState<Record<string, FrameDimensions>>({});

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const leadRequestIdRef = useRef<string | null>(null);
  const userImgRef = useRef<HTMLImageElement | null>(null);
  const frameImgRef = useRef<HTMLImageElement | null>(null);
  const lastFrameKey = useRef("");
  const pinchRef = useRef({ active: false, lastDist: 0, lastZoom: 1 });
  const renderStateRef = useRef<{
    dims: FrameDimensions;
    zoom: number;
    offset: { x: number; y: number };
    format: "stories" | "feed" | "perfil";
    hasPhoto: boolean;
  } | null>(null);

  const molduraAtual = molduras[molduraIndex] ?? {
    label: "",
    stories: "",
    feed: "",
    perfil: "",
  };
  const activeFrameUrl =
    format === "stories"
      ? molduraAtual.stories
      : format === "perfil"
        ? molduraAtual.perfil || molduraAtual.feed || molduraAtual.stories
        : molduraAtual.feed || molduraAtual.stories;

  const frameKey = `${molduraIndex}-${format}`;
  const defaultDims: FrameDimensions =
    format === "stories"
      ? { width: 1080, height: 1920 }
      : { width: 1080, height: 1080 };

  const currentDims = dimsMap[frameKey] ?? defaultDims;
  const aspectRatioCss = toCssAspectRatio(
    currentDims.width,
    currentDims.height,
  );
  const mobile = isMobileDevice();

  useEffect(() => {
    renderStateRef.current = {
      dims: currentDims,
      zoom,
      offset,
      format,
      hasPhoto,
    };
  }, [currentDims, format, hasPhoto, offset, zoom]);

  useEffect(() => {
    molduras.forEach((m, i) => {
      const urls: [string, string][] = [
        [`${i}-stories`, m.stories],
        [`${i}-feed`, m.feed || m.stories],
        [`${i}-perfil`, m.perfil || m.feed || m.stories],
      ];
      urls.forEach(([key, url]) => {
        if (!url) return;
        loadImage(`${url}?cb=${Date.now()}`, "anonymous")
          .then((img) => {
            setDimsMap((prev) => ({
              ...prev,
              [key]: { width: img.naturalWidth, height: img.naturalHeight },
            }));
          })
          .catch(() => {});
      });
    });
  }, [molduras]);

  const drawCanvas = useCallback(
    (
      userImg: HTMLImageElement,
      frameImg: HTMLImageElement | null,
      dims: FrameDimensions,
      z: number,
      off: { x: number; y: number },
      fmt?: "stories" | "feed" | "perfil",
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const W = dims.width;
      const H = dims.height;
      canvas.width = W;
      canvas.height = H;
      ctx.clearRect(0, 0, W, H);

      ctx.save();
      if (fmt === "perfil") {
        const radius = Math.min(W, H) / 2;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
      }

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
      drawCanvas(
        userImgRef.current,
        frameImgRef.current,
        currentDims,
        zoom,
        offset,
        format,
      );
    }
  }, [zoom, offset, format, molduraIndex, hasPhoto, currentDims, drawCanvas]);

  useEffect(() => {
    let cancelled = false;
    const drawWithFrame = (frame: HTMLImageElement | null) => {
      if (cancelled) return;
      frameImgRef.current = frame;
      const state = renderStateRef.current;
      if (userImgRef.current && state?.hasPhoto) {
        drawCanvas(
          userImgRef.current,
          frame,
          state.dims,
          state.zoom,
          state.offset,
          state.format,
        );
      }
    };

    if (!activeFrameUrl) {
      lastFrameKey.current = "";
      drawWithFrame(null);
      return () => {
        cancelled = true;
      };
    }

    const loadKey = `${frameKey}:${activeFrameUrl}`;
    if (lastFrameKey.current === loadKey) return;
    lastFrameKey.current = loadKey;

    loadImage(`${activeFrameUrl}?cb=${Date.now()}`, "anonymous")
      .then(drawWithFrame)
      .catch(() => {
        loadImage(activeFrameUrl, "anonymous")
          .then(drawWithFrame)
          .catch(() => drawWithFrame(null));
      });

    return () => {
      cancelled = true;
    };
  }, [activeFrameUrl, drawCanvas, frameKey]);

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
            drawCanvas(
              img,
              frameImgRef.current,
              currentDims,
              zoom,
              offset,
              format,
            );
            setIsLoading(false);
          });
        });
      } catch {
        alert("Não foi possível carregar a foto. Tente novamente.");
        setIsLoading(false);
      }
    },
    [drawCanvas, currentDims, zoom, offset, format],
  );

  const irParaMoldura = (index: number) => {
    if (index < 0 || index >= molduras.length) return;
    frameImgRef.current = null;
    lastFrameKey.current = "";
    setMolduraIndex(index);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

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
      const t1 = e.touches[0],
        t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      if (!pinchRef.current.active) {
        pinchRef.current = { active: true, lastDist: dist, lastZoom: zoom };
        setIsDragging(false);
        return;
      }
      let nextZoom =
        dist > pinchRef.current.lastDist
          ? pinchRef.current.lastZoom * 1.05
          : pinchRef.current.lastZoom * 0.98;
      nextZoom = Math.min(3, Math.max(0.5, nextZoom));
      pinchRef.current.lastDist = dist;
      pinchRef.current.lastZoom = nextZoom;
      setZoom(nextZoom);
      return;
    }
    if ("touches" in e && e.touches.length < 2) pinchRef.current.active = false;
    if (!isDragging) return;
    const p = getPos(e);
    setOffset((prev) => ({
      x: prev.x + (p.x - lastPos.x) * 2.5,
      y: prev.y + (p.y - lastPos.y) * 2.5,
    }));
    setLastPos(p);
  };

  const end = (e: React.TouchEvent | React.MouseEvent) => {
    if ("touches" in e && e.touches.length < 2) pinchRef.current.active = false;
    setIsDragging(false);
  };

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const getCanvasBlob = (): Promise<Blob> => {
    const canvas = canvasRef.current;
    if (!canvas) return Promise.reject(new Error("Canvas não disponível"));
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Erro ao gerar imagem"))),
        "image/png",
      ),
    );
  };

  const handleSave = useCallback(async () => {
    if (!canvasRef.current || isSaving) return;
    setIsSaving(true);
    try {
      const blob = await getCanvasBlob();
      await saveOrDownload(blob, `${nome_urna}-${format}.png`);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") console.error(err);
    }
    setIsSaving(false);
  }, [nome_urna, isSaving, format]);

  const handleShare = async () => {
    if (!canvasRef.current || isSharing) return;
    setIsSharing(true);
    try {
      const blob = await getCanvasBlob();
      const urlAtual =
        typeof window !== "undefined" ? window.location.href : "";
      await shareImage(
        blob,
        `${nome_urna}-${format}.png`,
        `Apoio ${nome_urna}! Crie a sua foto também 🗳️\n${urlAtual}`,
      );
      recordPublicEvent(candidatoId, "share").catch(() => {
        console.error("Não foi possível registrar o compartilhamento.");
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") console.error(err);
    }
    setIsSharing(false);
  };

  const handleSubmit = async (data: LeadData) => {
    if (!canvasRef.current || !hasPhoto) return;
    const requestId = leadRequestIdRef.current ?? createRequestId();
    leadRequestIdRef.current = requestId;

    const response = await fetch("/api/public/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request_id: requestId,
        candidato_slug: candidatoId,
        ...data,
      }),
      cache: "no-store",
    });

    if (!response.ok) throw new Error("Não foi possível registrar o apoio.");
    leadRequestIdRef.current = null;
    setIsSubmitted(true);
  };

  const temMultiplasMolduras = molduras.length > 1;

  return (
    <div className="flex flex-col gap-5 max-w-85 mx-auto">
      <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
        <button
          onClick={() => {
            setFormat("stories");
            reset();
          }}
          className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${format === "stories" ? "bg-white shadow" : "text-gray-400"}`}
        >
          <Layout size={14} /> Stories
        </button>
        <button
          onClick={() => {
            setFormat("feed");
            reset();
          }}
          className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${format === "feed" ? "bg-white shadow" : "text-gray-400"}`}
        >
          <Square size={14} /> Feed
        </button>
        <button
          onClick={() => {
            setFormat("perfil");
            reset();
          }}
          className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${format === "perfil" ? "bg-white shadow" : "text-gray-400"}`}
        >
          <UserSquare2 size={14} /> Perfil
        </button>
      </div>

      {temMultiplasMolduras && (
        <div className="flex items-center justify-center gap-3">
          {molduras.map((m, i) => {
            const previewUrl =
              format === "stories"
                ? m.stories
                : format === "perfil"
                  ? m.perfil || m.feed || m.stories
                  : m.feed || m.stories;
            const ativo = i === molduraIndex;
            return (
              <button
                key={i}
                onClick={() => irParaMoldura(i)}
                title={m.label || `Moldura ${i + 1}`}
                className="relative shrink-0 rounded-2xl overflow-hidden transition-all duration-200 active:scale-95"
                style={{
                  width: 52,
                  height: 72,
                  outline: ativo
                    ? `3px solid ${corPrimaria}`
                    : "3px solid transparent",
                  outlineOffset: 2,
                  boxShadow: ativo
                    ? `0 4px 16px ${corPrimaria}44`
                    : "0 1px 4px rgba(0,0,0,0.10)",
                  opacity: ativo ? 1 : 0.55,
                }}
              >
                {previewUrl ? (
                  // Molduras dinâmicas devem refletir uploads sem cache do otimizador.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={m.label || `Moldura ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase">
                      {i + 1}
                    </span>
                  </div>
                )}
                {ativo && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl"
                    style={{ backgroundColor: corPrimaria }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      <div
        className="relative w-full rounded-3xl overflow-hidden bg-gray-200 select-none"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        style={{ aspectRatio: aspectRatioCss, touchAction: "none" }}
      >
        {!hasPhoto && activeFrameUrl && (
          // A prévia precisa usar exatamente a mesma URL carregada pelo Canvas.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeFrameUrl}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            alt=""
          />
        )}
        {!hasPhoto && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className="text-black text-xs font-bold drop-shadow text-center px-4">
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

      {hasPhoto && (
        <div className="space-y-5">
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
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-600 text-white p-3 rounded-xl text-sm font-semibold disabled:opacity-60 active:scale-95 transition-transform"
              >
                {isSaving
                  ? "Abrindo..."
                  : mobile
                    ? "📥 Salvar na Galeria"
                    : "⬇️ Baixar Foto"}
              </button>
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="bg-green-500 text-white p-3 rounded-xl text-sm font-semibold disabled:opacity-60 active:scale-95 transition-transform"
              >
                {isSharing
                  ? "Abrindo..."
                  : mobile
                    ? "📤 Compartilhar"
                    : "💬 Compartilhar no WhatsApp"}
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
