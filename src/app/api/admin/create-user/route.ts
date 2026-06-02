// src/app/api/admin/create-user/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // ✅ validação de config (mantém teste existente)
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Configuração do servidor incompleta. Verifique SUPABASE_SERVICE_ROLE_KEY no .env.local e reinicie o servidor.",
      },
      { status: 500 },
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // ✅ proteção contra JSON inválido
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Payload JSON inválido." },
        { status: 400 },
      );
    }

    const { email, nome, tipo, slug_candidato } = body;

    // ✅ validação básica
    if (!email || !nome || !tipo) {
      return NextResponse.json(
        { error: "email, nome e tipo são obrigatórios." },
        { status: 400 },
      );
    }

    if (tipo === "candidato" && !slug_candidato) {
      return NextResponse.json(
        { error: "Selecione o candidato a vincular." },
        { status: 400 },
      );
    }

    // ✅ valida Authorization
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    // ✅ HARDENED: nunca assume retorno válido
    const result = await supabaseAdmin.auth.getUser(token);

    if (!result || result.error || !result.data?.user) {
      return NextResponse.json(
        { error: "Token inválido ou expirado." },
        { status: 403 }, // ✔ alinhado com teste
      );
    }

    const caller = result.data;

    // ✅ check admin
    const rpcResult = await supabaseAdmin.rpc("is_admin", {
      uid: caller.user.id,
    });

    if (!rpcResult || rpcResult.error || !rpcResult.data) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    // ✅ criação do usuário
    const inviteResult = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { nome, tipo },
        redirectTo: `${appUrl}/auth/callback`,
      },
    );

    if (!inviteResult || inviteResult.error || !inviteResult.data?.user) {
      return NextResponse.json(
        {
          error:
            "Erro ao criar usuário: " +
            (inviteResult?.error?.message || "desconhecido"),
        },
        { status: 400 },
      );
    }

    const newUserId = inviteResult.data.user.id;

    // ✅ fluxo admin
    if (tipo === "admin") {
      const { error } = await supabaseAdmin
        .from("admins")
        .insert({ user_id: newUserId, nome });

      if (error) {
        return NextResponse.json(
          {
            error:
              "Usuário criado mas falha ao registrar como admin: " +
              error.message,
          },
          { status: 500 },
        );
      }
    }

    // ✅ fluxo candidato
    if (tipo === "candidato") {
      const { error } = await supabaseAdmin
        .from("candidatos")
        .update({ user_id: newUserId })
        .eq("slug", slug_candidato);

      if (error) {
        return NextResponse.json(
          {
            error:
              "Usuário criado mas falha ao vincular candidato: " +
              error.message,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Convite enviado para ${email}.`,
    });
  } catch (err) {
    console.error("Erro na API create-user:", err);

    // ✅ nunca vaza stack
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
