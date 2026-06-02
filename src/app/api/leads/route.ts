import { NextResponse } from "next/server";
import { headers } from "next/headers";

// Simulação de cache simples para Rate Limit (Em prod, use Redis)
const ipCache = new Map<string, number>();

export async function POST(request: Request) {
  const headerList = headers();
  const ip = (await headerList).get("x-forwarded-for") || "anonymous";
  const now = Date.now();

  // RATE LIMIT: 1 lead a cada 30 segundos por IP
  if (ipCache.has(ip)) {
    const lastTime = ipCache.get(ip) || 0;
    if (now - lastTime < 30000) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde 30s." },
        { status: 429 },
      );
    }
  }

  const body = await request.json();
  const { nome, whatsapp } = body;

  // SANITIZAÇÃO SERVER-SIDE (Double check)
  if (!nome || nome.length < 3 || !/^\d{11}$/.test(whatsapp)) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  // AQUI: Você salvaria no seu banco de dados (Prisma, Supabase, etc)
  console.log(`Lead Seguro Recebido: ${nome} - ${whatsapp}`);

  ipCache.set(ip, now);
  return NextResponse.json({ success: true });
}
