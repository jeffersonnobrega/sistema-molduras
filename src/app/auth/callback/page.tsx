"use client";
// src/app/auth/callback/page.tsx

import { useEffect, useReducer } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

type State = { status: "loading" } | { status: "error"; message: string };

function reducer(_: State, action: State): State {
  return action;
}

export default function AuthCallbackPage() {
  const [state, dispatch] = useReducer(reducer, { status: "loading" });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const errorDescription =
      searchParams.get("error_description") ||
      hashParams.get("error_description");

    if (errorDescription) {
      dispatch({ status: "error", message: errorDescription });
      return;
    }

    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    if (accessToken && refreshToken) {
      // O reset-password valida e instala a sessão recebida no hash.
      window.location.replace(`/admin/reset-password${window.location.hash}`);
      return;
    }

    const code = searchParams.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          dispatch({
            status: "error",
            message: "Link expirado ou inválido. Solicite um novo.",
          });
          return;
        }
        window.location.replace("/admin/reset-password");
      });
      return;
    }

    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    if (tokenHash && (type === "invite" || type === "recovery")) {
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type })
        .then(({ error }) => {
          if (error) {
            dispatch({
              status: "error",
              message: "Link expirado ou inválido. Solicite um novo.",
            });
            return;
          }
          window.location.replace("/admin/reset-password");
        });
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.replace("/admin/reset-password");
        return;
      }
      dispatch({
        status: "error",
        message: "Link inválido. Nenhum token de convite foi encontrado.",
      });
    });
  }, []);

  if (state.status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-200 text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mx-auto text-3xl">
            ❌
          </div>
          <h1 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">
            Link <span className="text-red-600">Inválido</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium">{state.message}</p>
          <a
            href="/login"
            className="block w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-blue-600 text-white hover:bg-blue-700 transition-all"
          >
            Solicitar Novo Link
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="text-center space-y-4">
        <Loader2 className="animate-spin text-blue-600 mx-auto" size={40} />
        <p className="text-xs font-black uppercase text-slate-400 tracking-widest">
          Validando acesso...
        </p>
      </div>
    </div>
  );
}
