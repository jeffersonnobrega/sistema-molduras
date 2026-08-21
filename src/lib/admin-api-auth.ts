import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

type AuthorizedSuperadmin = {
  supabaseAdmin: SupabaseClient;
  user: User;
};

type AuthorizationError = {
  error: string;
  status: 401 | 403 | 500;
};

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function authorizeSuperadmin(
  request: NextRequest,
): Promise<AuthorizedSuperadmin | AuthorizationError> {
  const supabaseAdmin = createAdminClient();
  if (!supabaseAdmin) {
    return { error: "Configuração do servidor incompleta.", status: 500 };
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return { error: "Não autorizado.", status: 401 };
  }

  const accessToken = authorization.slice("Bearer ".length);
  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return { error: "Sessão inválida ou expirada.", status: 401 };
  }

  const { data: isAdmin, error: adminError } = await supabaseAdmin.rpc(
    "is_admin",
    { uid: userData.user.id },
  );

  if (adminError || isAdmin !== true) {
    return { error: "Acesso negado.", status: 403 };
  }

  const { data: assurance, error: assuranceError } =
    await supabaseAdmin.auth.mfa.getAuthenticatorAssuranceLevel(accessToken);

  if (assuranceError || assurance?.currentLevel !== "aal2") {
    return {
      error: "Autenticação em dois fatores necessária.",
      status: 403,
    };
  }

  return { supabaseAdmin, user: userData.user };
}
