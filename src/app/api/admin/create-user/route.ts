import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

async function findUserByEmail(
  supabaseAdmin: SupabaseClient,
  email: string,
): Promise<User | null> {
  const perPage = 200;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;

    const existingUser = data.users.find(
      (user) => user.email?.toLowerCase() === email,
    );
    if (existingUser) return existingUser;
    if (data.users.length < perPage) return null;
  }
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = req.nextUrl.origin.replace(/\/$/, "");

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Configuração do servidor incompleta." },
      { status: 500 },
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Payload JSON inválido." },
        { status: 400 },
      );
    }

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const nome = typeof body.nome === "string" ? body.nome.trim() : "";
    const tipo =
      body.tipo === "admin"
        ? "admin"
        : body.tipo === "candidato"
          ? "candidato"
          : null;
    const rawSlugs = Array.isArray(body.slug_candidatos)
      ? body.slug_candidatos
      : typeof body.slug_candidato === "string"
        ? [body.slug_candidato]
        : [];
    const slugsCandidatos = [
      ...new Set(
        rawSlugs
          .filter((slug): slug is string => typeof slug === "string")
          .map((slug) => slug.trim())
          .filter(Boolean),
      ),
    ];

    if (
      !email ||
      !nome ||
      !tipo ||
      (tipo === "candidato" && slugsCandidatos.length === 0)
    ) {
      return NextResponse.json(
        { error: "Email, nome e tipo de acesso são obrigatórios." },
        { status: 400 },
      );
    }
    if (slugsCandidatos.length > 100) {
      return NextResponse.json(
        { error: "Selecione no máximo 100 candidatos por operação." },
        { status: 400 },
      );
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
    const { data: callerData, error: callerError } =
      await supabaseAdmin.auth.getUser(authHeader.slice("Bearer ".length));
    if (callerError || !callerData.user) {
      return NextResponse.json(
        { error: "Token inválido ou expirado." },
        { status: 403 },
      );
    }

    const { data: isAdmin, error: adminError } = await supabaseAdmin.rpc(
      "is_admin",
      { uid: callerData.user.id },
    );
    if (adminError || !isAdmin) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    let candidatos: { id: string; slug: string }[] = [];
    if (tipo === "candidato") {
      const { data, error: candidatoError } = await supabaseAdmin
        .from("candidatos")
        .select("id, slug")
        .in("slug", slugsCandidatos);
      if (candidatoError) {
        return NextResponse.json(
          { error: "Falha ao validar candidatos." },
          { status: 500 },
        );
      }
      candidatos = data || [];
      if (candidatos.length !== slugsCandidatos.length) {
        return NextResponse.json(
          { error: "Um ou mais candidatos não foram encontrados." },
          { status: 400 },
        );
      }
    }

    let user = await findUserByEmail(supabaseAdmin, email);
    let createdUser = false;

    if (!user) {
      const { data: inviteData, error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { nome, tipo },
          redirectTo: `${appUrl}/auth/callback`,
        });
      if (inviteError || !inviteData.user) {
        return NextResponse.json(
          {
            error:
              "Erro ao criar usuário: " +
              (inviteError?.message || "desconhecido"),
          },
          { status: 400 },
        );
      }
      user = inviteData.user;
      createdUser = true;
    }

    if (tipo === "admin") {
      const { data: existingAdmin, error: adminLookupError } =
        await supabaseAdmin
          .from("admins")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();
      if (adminLookupError) {
        if (createdUser) await supabaseAdmin.auth.admin.deleteUser(user.id);
        return NextResponse.json(
          { error: "Falha ao consultar acesso administrativo." },
          { status: 500 },
        );
      }
      if (existingAdmin) {
        return NextResponse.json({
          success: true,
          message: `${email} já possui acesso de administrador geral.`,
        });
      }

      const { error: adminLinkError } = await supabaseAdmin
        .from("admins")
        .insert({ user_id: user.id, nome });
      if (adminLinkError) {
        if (createdUser) await supabaseAdmin.auth.admin.deleteUser(user.id);
        return NextResponse.json(
          { error: "Falha ao vincular acesso: " + adminLinkError.message },
          { status: 500 },
        );
      }
    } else {
      const candidatoIds = candidatos.map((candidato) => candidato.id);
      const { data: existingLinks, error: linksError } = await supabaseAdmin
        .from("candidato_admins")
        .select("candidato_id")
        .eq("user_id", user.id)
        .in("candidato_id", candidatoIds);
      if (linksError) {
        if (createdUser) await supabaseAdmin.auth.admin.deleteUser(user.id);
        return NextResponse.json(
          { error: "Falha ao consultar vínculos existentes." },
          { status: 500 },
        );
      }

      const linkedIds = new Set(
        (existingLinks || []).map((link) => link.candidato_id),
      );
      const newCandidates = candidatos.filter(
        (candidato) => !linkedIds.has(candidato.id),
      );

      if (newCandidates.length > 0) {
        const { error: vinculoError } = await supabaseAdmin
          .from("candidato_admins")
          .insert(
            newCandidates.map((candidato) => ({
              user_id: user.id,
              candidato_id: candidato.id,
              nome,
              created_by: callerData.user.id,
            })),
          );
        if (vinculoError) {
          if (createdUser) await supabaseAdmin.auth.admin.deleteUser(user.id);
          return NextResponse.json(
            { error: "Falha ao vincular acesso: " + vinculoError.message },
            { status: 500 },
          );
        }
      }

      if (newCandidates.length === 0) {
        return NextResponse.json({
          success: true,
          message: `${email} já estava vinculado aos candidatos selecionados.`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: createdUser
        ? `Convite enviado para ${email} com os acessos selecionados.`
        : `Novos acessos vinculados a ${email}.`,
    });
  } catch (error) {
    console.error(
      "Erro na API create-user:",
      error instanceof Error ? error.message : "erro inesperado",
    );
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
