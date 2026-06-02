// tests/setup.ts
import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock das variáveis de ambiente
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.RESEND_API_KEY = "re_test_key";
process.env.CONTACT_EMAIL = "test@test.com";

// Mock global do performance (caso o ambiente não suporte)
if (typeof performance === "undefined") {
  global.performance = { now: () => Date.now() } as Performance;
}

// Limpa todos os mocks entre testes
afterEach(() => {
  vi.clearAllMocks();
});
