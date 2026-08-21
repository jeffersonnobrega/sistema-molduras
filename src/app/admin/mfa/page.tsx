"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Copy, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Enrollment = {
  qrCode: string;
  secret: string;
};

function getSafeDestination() {
  const requested = new URLSearchParams(window.location.search).get("next");

  if (
    requested?.startsWith("/admin/") &&
    !requested.startsWith("//") &&
    requested !== "/admin/mfa" &&
    requested !== "/admin/reset-password"
  ) {
    return requested;
  }

  return "/admin/dashboard";
}

function normalizeQrCode(qrCode: string) {
  if (qrCode.startsWith("data:")) return qrCode;
  return `data:image/svg+xml;utf-8,${encodeURIComponent(qrCode)}`;
}

export default function MfaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!active) return;

      if (userError || !userData.user) {
        router.replace("/login");
        return;
      }

      const { data: isAdmin, error: adminError } = await supabase.rpc(
        "is_admin",
        { uid: userData.user.id },
      );
      if (!active) return;

      if (adminError || isAdmin !== true) {
        router.replace("/admin/dashboard");
        return;
      }

      const { data: assurance, error: assuranceError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!active) return;

      if (assuranceError) {
        setError("Não foi possível validar o nível de autenticação.");
        setLoading(false);
        return;
      }

      if (assurance?.currentLevel === "aal2") {
        router.replace(getSafeDestination());
        return;
      }

      const { data: factors, error: factorsError } =
        await supabase.auth.mfa.listFactors();
      if (!active) return;

      if (factorsError) {
        setError("Não foi possível consultar os fatores de autenticação.");
        setLoading(false);
        return;
      }

      const verifiedFactor = factors?.totp[0];
      if (verifiedFactor) {
        setFactorId(verifiedFactor.id);
        setLoading(false);
        return;
      }

      const unverifiedTotp =
        factors?.all.filter(
          (factor) =>
            factor.factor_type === "totp" && factor.status === "unverified",
        ) || [];

      for (const factor of unverifiedTotp) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      const { data: enrolled, error: enrollError } =
        await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "Sistema Moldura",
        });
      if (!active) return;

      if (enrollError || !enrolled) {
        setError("Não foi possível iniciar o cadastro do autenticador.");
        setLoading(false);
        return;
      }

      setFactorId(enrolled.id);
      setEnrollment({
        qrCode: normalizeQrCode(enrolled.totp.qr_code),
        secret: enrolled.totp.secret,
      });
      setLoading(false);
    };

    void initialize();

    return () => {
      active = false;
    };
  }, [router]);

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedCode = code.replace(/\D/g, "");

    if (!factorId || normalizedCode.length !== 6) {
      setError("Informe o código de 6 dígitos do aplicativo autenticador.");
      return;
    }

    setVerifying(true);
    setError("");

    const { error: verifyError } =
      await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: normalizedCode,
      });

    if (verifyError) {
      setError("Código inválido ou expirado. Gere um novo código e tente novamente.");
      setVerifying(false);
      return;
    }

    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (assuranceError || assurance?.currentLevel !== "aal2") {
      setError("O segundo fator não elevou a sessão para AAL2.");
      setVerifying(false);
      return;
    }

    router.replace(getSafeDestination());
    router.refresh();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/login");
    router.refresh();
  };

  const handleCopySecret = async () => {
    if (!enrollment) return;
    await navigator.clipboard.writeText(enrollment.secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 flex items-center justify-center">
      <section className="w-full max-w-md rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <ShieldCheck size={26} />
            </div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">
              Verificação em <span className="text-blue-600">duas etapas</span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Esta confirmação é obrigatória para administradores gerais.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl p-3 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Sair do sistema"
          >
            <LogOut size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-bold text-slate-400">
            <Loader2 className="animate-spin" size={18} /> Preparando verificação...
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-5">
            {enrollment && (
              <div className="space-y-4 rounded-3xl border border-blue-100 bg-blue-50/60 p-5 text-center">
                <p className="text-xs font-bold leading-relaxed text-slate-600">
                  Escaneie o QR Code no Google Authenticator, Microsoft
                  Authenticator ou aplicativo compatível.
                </p>
                <Image
                  src={enrollment.qrCode}
                  alt="QR Code para configurar o autenticador"
                  width={192}
                  height={192}
                  unoptimized
                  className="mx-auto rounded-2xl bg-white p-2"
                />
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Código para cadastro manual
                  </p>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="mx-auto flex max-w-full items-center gap-2 rounded-xl bg-white px-3 py-2 font-mono text-xs font-bold text-slate-700 shadow-sm"
                  >
                    <span className="truncate">{enrollment.secret}</span>
                    <Copy size={14} className="shrink-0" />
                  </button>
                  {copied && (
                    <p className="text-[10px] font-bold text-green-600">
                      Código copiado.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="mfa-code"
                className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500"
              >
                Código do autenticador
              </label>
              <input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                placeholder="000000"
                maxLength={6}
                autoFocus
                disabled={verifying}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center font-mono text-2xl font-black tracking-[0.4em] text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
              />
            </div>

            {error && (
              <p className="rounded-2xl bg-red-50 p-3 text-center text-xs font-bold leading-relaxed text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={verifying || !factorId}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg transition hover:bg-blue-700 disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Validando...
                </>
              ) : (
                "Confirmar e acessar"
              )}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
