import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Configuração do servidor incompleta." }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const nome = typeof body.nome === "string" ? body.nome.trim() : "";
    const tipo = body.tipo === "admin" ? "admin" : body.tipo === "candidato" ? "candidato" : null;
    const slugCandidato = typeof body.slug_candidato === "string" ? body.slug_candidato : "";
    if (!email || !nome || !tipo || (tipo === "candidato" && !slugCandidato)) {
      return NextResponse.json({ error: "Email, nome e tipo de acesso são obrigatórios." }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
    const { data: callerData, error: callerError } =
      await supabaseAdmin.auth.getUser(authHeader.slice("Bearer ".length));
    if (callerError || !callerData.user) {
      return NextResponse.json({ error: "Token inválido ou expirado." }, { status: 403 });
    }

    const { data: isAdmin, error: adminError } = await supabaseAdmin.rpc("is_admin", {
      uid: callerData.user.id,
    });
    if (adminError || !isAdmin) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    let candidatoId: string | null = null;
    if (tipo === "candidato") {
      const { data: candidato, error: candidatoError } = await supabaseAdmin
        .from("candidatos")
        .select("id")
        .eq("slug", slugCandidato)
        .single();
      if (candidatoError || !candidato) {
        return NextResponse.json({ error: "Candidato não encontrado." }, { status: 400 });
      }
      candidatoId = candidato.id;
    }

    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { nome, tipo },
        redirectTo: `${appUrl}/auth/callback`,
      });
    if (inviteError || !inviteData.user) {
      return NextResponse.json(
        { error: "Erro ao criar usuário: " + (inviteError?.message || "desconhecido") },
        { status: 400 },
      );
    }

    const { error: vinculoError } = tipo === "admin"
      ? await supabaseAdmin.from("admins").insert({ user_id: inviteData.user.id, nome })
      : await supabaseAdmin.from("candidato_admins").insert({
          user_id: inviteData.user.id,
          candidato_id: candidatoId,
          nome,
          created_by: callerData.user.id,
        });
    if (vinculoError) {
      await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id);
      return NextResponse.json({ error: "Falha ao vincular acesso: " + vinculoError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Convite enviado para ${email}.` });
  } catch (error) {
    console.error("Erro na API create-user:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
