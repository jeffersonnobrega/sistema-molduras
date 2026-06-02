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
    const code = new URLSearchParams(window.location.search).get("code");

    if (!code) {
      dispatch({
        status: "error",
        message: "Link inválido. Nenhum código encontrado.",
      });
      return;
    }

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
