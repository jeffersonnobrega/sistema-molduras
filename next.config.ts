import type { NextConfig } from "next";

const FRAME_ALLOWLIST_ENV = "CANDIDATE_FRAME_ALLOWLIST";

function getSupabaseOrigins() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!rawUrl) return [];

  try {
    const url = new URL(rawUrl);
    const websocketUrl = new URL(rawUrl);
    websocketUrl.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return [url.origin, websocketUrl.origin];
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL deve conter uma URL válida.");
  }
}

function getCandidateFrameAllowlist() {
  const rawAllowlist = process.env[FRAME_ALLOWLIST_ENV];
  if (!rawAllowlist) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawAllowlist);
  } catch {
    throw new Error(`${FRAME_ALLOWLIST_ENV} deve conter um objeto JSON válido.`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${FRAME_ALLOWLIST_ENV} deve ser um objeto JSON.`);
  }

  const entries = Object.entries(parsed);
  if (entries.length > 50) {
    throw new Error(`${FRAME_ALLOWLIST_ENV} aceita no máximo 50 candidatos.`);
  }

  return entries.map(([slug, configuredOrigins]) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error(`Slug inválido em ${FRAME_ALLOWLIST_ENV}: ${slug}`);
    }
    if (!Array.isArray(configuredOrigins) || configuredOrigins.length === 0) {
      throw new Error(`O candidato ${slug} precisa ter ao menos uma origem permitida.`);
    }
    if (configuredOrigins.length > 20) {
      throw new Error(`O candidato ${slug} excede o limite de 20 origens permitidas.`);
    }

    const origins = configuredOrigins.map((configuredOrigin) => {
      if (typeof configuredOrigin !== "string") {
        throw new Error(`Origem inválida configurada para o candidato ${slug}.`);
      }

      let url: URL;
      try {
        url = new URL(configuredOrigin);
      } catch {
        throw new Error(`Origem inválida configurada para o candidato ${slug}.`);
      }

      if (
        url.protocol !== "https:" ||
        url.origin !== configuredOrigin ||
        url.username ||
        url.password
      ) {
        throw new Error(
          `A origem de ${slug} deve ser HTTPS e não pode conter caminho, credenciais, query ou fragmento.`,
        );
      }

      return url.origin;
    });

    return { slug, origins: [...new Set(origins)] };
  });
}

const supabaseOrigins = getSupabaseOrigins();
const candidateFrameAllowlist = getCandidateFrameAllowlist();
const isDevelopment = process.env.NODE_ENV === "development";
const supabaseHttpOrigins = supabaseOrigins.filter((origin) =>
  origin.startsWith("http"),
);

const reportOnlyCsp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://images.unsplash.com ${supabaseHttpOrigins.join(" ")}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigins.join(" ")} https://challenges.cloudflare.com`,
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  `media-src 'self' blob: ${supabaseHttpOrigins.join(" ")}`,
].join("; ");

const nextConfig: NextConfig = {
  reactCompiler: true,
  ...(isDevelopment ? { allowedDevOrigins: ["192.168.1.4"] } : {}),
  images: {
    remotePatterns: [
      new URL(
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop",
      ),
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value: reportOnlyCsp,
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
        ],
      },
      ...candidateFrameAllowlist.map(({ slug, origins }) => ({
        source: `/candidato/${slug}`,
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${origins.join(" ")}`,
          },
        ],
      })),
    ];
  },
};

export default nextConfig;
