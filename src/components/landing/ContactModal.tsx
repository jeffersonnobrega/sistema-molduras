"use client";

import Script from "next/script";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Loader2, Send, X } from "lucide-react";
import { CONTACT_ROLES } from "@/lib/contact";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      theme: "auto";
      action: "contact";
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TurnstileChallengeProps {
  siteKey: string;
  onToken: (token: string) => void;
}

const TURNSTILE_DEVELOPMENT_SITE_KEY = "1x00000000000000000000AA";

function TurnstileChallenge({ siteKey, onToken }: TurnstileChallengeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onToken,
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken(""),
      theme: "auto",
      action: "contact",
    });
  }, [onToken, siteKey]);

  useEffect(() => {
    renderWidget();
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderWidget}
      />
      <div ref={containerRef} className="min-h-[65px] flex justify-center" />
    </>
  );
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    (process.env.NODE_ENV === "development"
      ? TURNSTILE_DEVELOPMENT_SITE_KEY
      : undefined);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cargo, setCargo] = useState<(typeof CONTACT_ROLES)[number]>(
    CONTACT_ROLES[0],
  );
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [challengeKey, setChallengeKey] = useState(0);
  const [formStartedAt, setFormStartedAt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) setFormStartedAt(Date.now());
  }, [isOpen]);

  if (!isOpen) return null;

  const formatWhatsapp = (value: string) => {
    const nums = value.replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 2) return nums;
    if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
  };

  const handleWhatsappChange = (event: ChangeEvent<HTMLInputElement>) => {
    setWhatsapp(formatWhatsapp(event.target.value));
    setError("");
  };

  const resetChallenge = () => {
    setTurnstileToken("");
    setChallengeKey((current) => current + 1);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    const nums = whatsapp.replace(/\D/g, "");
    if (nums.length < 10) {
      setError("Digite um WhatsApp válido com DDD.");
      return;
    }
    if (!siteKey || !turnstileToken) {
      setError("Conclua a verificação de segurança.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          whatsapp,
          cargo,
          website,
          turnstile_token: turnstileToken,
          form_started_at: formStartedAt,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Erro ao enviar. Tente novamente.");
        resetChallenge();
        return;
      }

      setSuccess(true);
    } catch {
      setError("Erro de conexão. Tente novamente.");
      resetChallenge();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNome("");
    setWhatsapp("");
    setCargo(CONTACT_ROLES[0]);
    setWebsite("");
    setTurnstileToken("");
    setChallengeKey(0);
    setFormStartedAt(0);
    setError("");
    setSuccess(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
    >
      <div className="bg-white rounded-[2.5rem] border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fechar"
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-8 sm:p-10">
          {!success ? (
            <div className="space-y-6">
              <div>
                <h3
                  id="contact-modal-title"
                  className="text-2xl font-black uppercase tracking-tighter text-slate-900"
                >
                  Leve o sistema para sua campanha
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
                  Preencha e nossa equipe entrará em contato hoje.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2"
                  >
                    Seu Nome
                  </label>
                  <input
                    id="contact-name"
                    required
                    type="text"
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    value={nome}
                    disabled={loading}
                    onChange={(event) => {
                      setNome(event.target.value);
                      setError("");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold focus:outline-none focus:border-blue-600 transition-all disabled:opacity-50"
                    placeholder="Ex: João Silva"
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact-whatsapp"
                    className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2"
                  >
                    WhatsApp de Contato
                  </label>
                  <input
                    id="contact-whatsapp"
                    required
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={whatsapp}
                    disabled={loading}
                    onChange={handleWhatsappChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold focus:outline-none focus:border-blue-600 transition-all disabled:opacity-50"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact-role"
                    className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2"
                  >
                    Cargo de Interesse
                  </label>
                  <select
                    id="contact-role"
                    value={cargo}
                    disabled={loading}
                    onChange={(event) =>
                      setCargo(
                        event.target.value as (typeof CONTACT_ROLES)[number],
                      )
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold focus:outline-none focus:border-blue-600 transition-all text-slate-600 disabled:opacity-50"
                  >
                    {CONTACT_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  aria-hidden="true"
                  className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
                >
                  <label htmlFor="contact-website">Website</label>
                  <input
                    id="contact-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                  />
                </div>

                {siteKey ? (
                  <TurnstileChallenge
                    key={challengeKey}
                    siteKey={siteKey}
                    onToken={setTurnstileToken}
                  />
                ) : (
                  <p className="text-[11px] text-amber-700 font-bold text-center bg-amber-50 py-2 px-3 rounded-xl">
                    Formulário temporariamente indisponível.
                  </p>
                )}

                {error && (
                  <p className="text-[11px] text-red-600 font-bold text-center bg-red-50 py-2 px-3 rounded-xl">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !siteKey || !turnstileToken}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 mt-2 active:scale-95 disabled:opacity-50 shadow-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={14} /> Enviando...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Solicitar Demonstração
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-2xl">
                ✓
              </div>
              <h3 className="text-xl font-black uppercase text-slate-900 tracking-tighter">
                Obrigado pelo contato!
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Nossa equipe de consultoria política vai te chamar no WhatsApp
                nas próximas horas.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-4 text-[10px] font-black uppercase text-blue-600 tracking-widest hover:underline"
              >
                Fechar Janela
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
