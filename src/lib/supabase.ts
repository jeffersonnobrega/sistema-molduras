import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente principal com SSR (para uso geral na aplicação)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Cliente auth sem PKCE — usado exclusivamente para resetPasswordForEmail e invite
// Evita o problema do code verifier não encontrado no storage
export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: "implicit",
    persistSession: true,
    detectSessionInUrl: true,
  },
});
