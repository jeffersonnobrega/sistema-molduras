"use client";

import { useState } from "react";
import { supabase, supabaseAuth } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

type Mode = "login" | "reset_request" | "reset_sent";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Preencha todos os campos.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setError("Email ou senha incorretos.");
        return;
      }
      if (data?.session) window.location.replace("/admin/dashboard");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Digite seu email.");
      return;
    }
    setLoading(true);
    try {
      // Usa supabaseAuth (implicit flow) para evitar problema do PKCE verifier
      const { error } = await supabaseAuth.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/admin/reset-password`,
        },
      );
      if (error) {
        setError("Erro ao enviar email: " + error.message);
        return;
      }
      setMode("reset_sent");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-200 space-y-6">
        <div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">
            {mode === "login" && (
              <>
                Acesso <span className="text-blue-600">Administrativo</span>
              </>
            )}
            {mode === "reset_request" && (
              <>
                Redefinir <span className="text-blue-600">Senha</span>
              </>
            )}
            {mode === "reset_sent" && (
              <>
                Email <span className="text-blue-600">Enviado</span>
              </>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            {mode === "login" &&
              "Entre com suas credenciais para acessar o painel."}
            {mode === "reset_request" &&
              "Informe seu email para receber o link de redefinição."}
            {mode === "reset_sent" &&
              `Verifique a caixa de entrada de ${email}.`}
          </p>
        </div>

        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              disabled={loading}
              autoComplete="email"
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-blue-500 transition-all disabled:opacity-50 text-sm"
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              disabled={loading}
              autoComplete="current-password"
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-blue-500 transition-all disabled:opacity-50 text-sm"
            />
            {error && (
              <p className="text-[11px] text-red-600 font-bold text-center">
                ⚠️ {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-lg active:scale-95 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Autenticando...
                </>
              ) : (
                "Entrar no Painel"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("reset_request");
                setError("");
              }}
              className="w-full text-center text-[11px] text-slate-400 hover:text-blue-600 font-bold transition-colors pt-1"
            >
              Esqueci minha senha
            </button>
          </form>
        )}

        {mode === "reset_request" && (
          <form onSubmit={handleResetRequest} className="space-y-4">
            <input
              type="email"
              placeholder="Seu email cadastrado"
              value={email}
              disabled={loading}
              autoComplete="email"
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-blue-500 transition-all disabled:opacity-50 text-sm"
            />
            {error && (
              <p className="text-[11px] text-red-600 font-bold text-center">
                ⚠️ {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-lg active:scale-95 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Enviando...
                </>
              ) : (
                "Enviar Link de Redefinição"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 font-bold transition-colors pt-1"
            >
              ← Voltar ao login
            </button>
          </form>
        )}

        {mode === "reset_sent" && (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-3xl flex items-center justify-center mx-auto text-3xl">
              ✉️
            </div>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              Um link foi enviado para{" "}
              <strong className="text-slate-800">{email}</strong>.
              <br />
              Verifique também a pasta de spam.
            </p>
            <button
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className="w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
            >
              Voltar ao Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
