"use client";
// src/app/admin/reset-password/page.tsx
// Com implicit flow, os tokens chegam no HASH da URL: #access_token=...&type=recovery

import { useState, useEffect } from "react";
import { supabaseAuth } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

type Stage = "loading" | "form" | "done" | "error";

export default function ResetPasswordPage() {
  const [stage, setStage] = useState<Stage>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [errorDetail, setErrorDetail] = useState("");

  useEffect(() => {
    // Com implicit flow, tokens chegam no hash: #access_token=xxx&type=recovery
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);

    // Verifica erro no hash
    const hashError = hashParams.get("error");
    if (hashError) {
      const code = hashParams.get("error_code");
      setErrorDetail(
        code === "otp_expired"
          ? "O link expirou. Solicite um novo link."
          : hashParams.get("error_description") || "Link inválido.",
      );
      setStage("error");
      return;
    }

    // Verifica erro nos query params (fallback)
    const searchParams = new URLSearchParams(window.location.search);
    const searchError = searchParams.get("error");
    if (searchError) {
      setErrorDetail(
        searchParams.get("error_code") === "otp_expired"
          ? "O link expirou. Solicite um novo link."
          : searchParams.get("error_description") || "Link inválido.",
      );
      setStage("error");
      return;
    }

    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken && refreshToken) {
      // Seta a sessão com os tokens do hash
      supabaseAuth.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            setErrorDetail("Erro ao validar sessão: " + error.message);
            setStage("error");
          } else {
            // Limpa o hash da URL
            window.history.replaceState(null, "", window.location.pathname);
            setStage("form");
          }
        });
      return;
    }

    // Sem tokens — verifica se já tem sessão ativa
    supabaseAuth.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStage("form");
      } else {
        setErrorDetail(
          "Nenhum token encontrado. Use o link completo enviado por email.",
        );
        setStage("error");
      }
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (password.length < 8) {
      setFormError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setFormError("As senhas não coincidem.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabaseAuth.auth.updateUser({ password });
      if (error) {
        setFormError("Erro ao salvar: " + error.message);
        return;
      }
      setStage("done");
      setTimeout(() => window.location.replace("/admin/dashboard"), 2000);
    } catch {
      setFormError("Erro de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const strengthLevel =
    password.length === 0
      ? -1
      : password.length < 8
        ? 0
        : password.length < 10
          ? 1
          : password.length < 12
            ? 2
            : password.length < 16
              ? 3
              : 4;

  const strengthLabel = ["Muito curta", "Fraca", "Boa", "Forte", "Muito forte"];
  const strengthColor = [
    "bg-red-400",
    "bg-red-400",
    "bg-yellow-400",
    "bg-blue-400",
    "bg-green-400",
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-200 space-y-6">
        {stage === "loading" && (
          <div className="text-center space-y-4 py-8">
            <Loader2 className="animate-spin text-blue-600 mx-auto" size={40} />
            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">
              Verificando sessão...
            </p>
          </div>
        )}

        {stage === "error" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mx-auto text-3xl">
              ❌
            </div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">
              Link <span className="text-red-600">Inválido</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              {errorDetail}
            </p>
            <a
              href="/login"
              className="block w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-blue-600 text-white hover:bg-blue-700 transition-all text-center active:scale-95"
            >
              Solicitar Novo Link
            </a>
          </div>
        )}

        {stage === "form" && (
          <>
            <div>
              <h1 className="text-2xl font-black uppercase italic tracking-tighter">
                Definir <span className="text-blue-600">Senha</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Crie uma senha segura com pelo menos 8 caracteres.
              </p>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <input
                type="password"
                placeholder="Nova senha (mín. 8 caracteres)"
                value={password}
                disabled={saving}
                autoComplete="new-password"
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFormError("");
                }}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-blue-500 transition-all text-sm"
              />
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${strengthLevel > i ? strengthColor[strengthLevel] : "bg-slate-100"}`}
                      />
                    ))}
                  </div>
                  {strengthLevel >= 0 && (
                    <p className="text-[10px] text-slate-400">
                      {strengthLabel[strengthLevel]}
                    </p>
                  )}
                </div>
              )}
              <input
                type="password"
                placeholder="Confirmar nova senha"
                value={confirm}
                disabled={saving}
                autoComplete="new-password"
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setFormError("");
                }}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-blue-500 transition-all text-sm"
              />
              {confirm.length > 0 && (
                <p
                  className={`text-[10px] font-medium ${password === confirm ? "text-green-500" : "text-red-400"}`}
                >
                  {password === confirm
                    ? "✓ Senhas coincidem"
                    : "✗ Senhas não coincidem"}
                </p>
              )}
              {formError && (
                <p className="text-[11px] text-red-600 font-bold text-center bg-red-50 py-2 px-3 rounded-xl">
                  ⚠️ {formError}
                </p>
              )}
              <button
                type="submit"
                disabled={saving || password !== confirm || password.length < 8}
                className="w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Salvando...
                  </>
                ) : (
                  "Salvar Senha e Entrar"
                )}
              </button>
            </form>
          </>
        )}

        {stage === "done" && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 bg-green-50 rounded-3xl flex items-center justify-center mx-auto text-3xl">
              ✅
            </div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">
              Senha <span className="text-green-600">Definida!</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Redirecionando para o painel...
            </p>
            <Loader2 className="animate-spin text-blue-400 mx-auto" size={24} />
          </div>
        )}
      </div>
    </div>
  );
}
