import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function authorize(req: NextRequest) {
  const supabaseAdmin = getAdminClient();
  if (!supabaseAdmin) return { error: "Configuração incompleta.", status: 500 } as const;
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return { error: "Não autorizado.", status: 401 } as const;
  const { data, error } = await supabaseAdmin.auth.getUser(authHeader.slice("Bearer ".length));
  if (error || !data.user) return { error: "Sessão inválida.", status: 401 } as const;
  const { data: isAdmin, error: adminError } = await supabaseAdmin.rpc("is_admin", { uid: data.user.id });
  if (adminError || !isAdmin) return { error: "Acesso negado.", status: 403 } as const;
  return { supabaseAdmin, user: data.user };
}

export async function GET(req: NextRequest) {
  const auth = await authorize(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [vinculosResult, adminsResult] = await Promise.all([
    auth.supabaseAdmin
      .from("candidato_admins")
      .select("id, user_id, candidato_id, nome, created_at, candidatos(nome_urna, slug)")
      .order("created_at", { ascending: false }),
    auth.supabaseAdmin.from("admins").select("user_id, nome"),
  ]);
  if (vinculosResult.error) return NextResponse.json({ error: vinculosResult.error.message }, { status: 500 });
  if (adminsResult.error) return NextResponse.json({ error: adminsResult.error.message }, { status: 500 });

  const { data: authUsers, error: usersError } =
    await auth.supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });
  const emails = new Map(authUsers.users.map((user) => [user.id, user.email]));
  const authById = new Map(authUsers.users.map((user) => [user.id, user]));
  const gestores = (vinculosResult.data || []).map((vinculo) => ({
    ...vinculo,
    tipo: "candidato" as const,
    email: emails.get(vinculo.user_id) || "",
  }));
  const administradores = (adminsResult.data || []).map((admin) => ({
    id: `admin-${admin.user_id}`,
    user_id: admin.user_id,
    nome: admin.nome,
    email: emails.get(admin.user_id) || "",
    created_at: authById.get(admin.user_id)?.created_at || "",
    candidatos: null,
    tipo: "admin" as const,
    is_current_user: admin.user_id === auth.user.id,
  }));
  return NextResponse.json({
    users: [...administradores, ...gestores],
  });
}

export async function DELETE(req: NextRequest) {
  const auth = await authorize(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { vinculo_id?: string; user_id?: string; tipo?: "admin" | "candidato" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }
  if (!body.vinculo_id || !body.user_id || !body.tipo) {
    return NextResponse.json({ error: "Vínculo inválido." }, { status: 400 });
  }

  if (body.tipo === "admin") {
    if (body.user_id === auth.user.id) {
      return NextResponse.json({ error: "Você não pode remover o próprio acesso." }, { status: 400 });
    }
    const { count: totalAdmins } = await auth.supabaseAdmin
      .from("admins")
      .select("user_id", { count: "exact", head: true });
    if ((totalAdmins || 0) <= 1) {
      return NextResponse.json({ error: "O sistema precisa manter ao menos um administrador geral." }, { status: 400 });
    }
    const { error: adminDeleteError } = await auth.supabaseAdmin
      .from("admins")
      .delete()
      .eq("user_id", body.user_id);
    if (adminDeleteError) return NextResponse.json({ error: adminDeleteError.message }, { status: 500 });
    const { count: candidateLinks } = await auth.supabaseAdmin
      .from("candidato_admins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", body.user_id);
    if ((candidateLinks || 0) === 0) {
      await auth.supabaseAdmin.auth.admin.deleteUser(body.user_id);
    }
    return NextResponse.json({ success: true });
  }

  const { data: vinculo, error: lookupError } = await auth.supabaseAdmin
    .from("candidato_admins")
    .select("id, user_id")
    .eq("id", body.vinculo_id)
    .eq("user_id", body.user_id)
    .single();
  if (lookupError || !vinculo) return NextResponse.json({ error: "Vínculo não encontrado." }, { status: 404 });

  const { error: deleteError } = await auth.supabaseAdmin
    .from("candidato_admins")
    .delete()
    .eq("id", vinculo.id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  const { count } = await auth.supabaseAdmin
    .from("candidato_admins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", vinculo.user_id);
  const { count: adminCount } = await auth.supabaseAdmin
    .from("admins")
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", vinculo.user_id);
  if ((count || 0) === 0 && (adminCount || 0) === 0) {
    await auth.supabaseAdmin.auth.admin.deleteUser(vinculo.user_id);
  }

  return NextResponse.json({ success: true });
}
