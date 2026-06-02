// src/app/api/contato/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const destinatario = process.env.CONTACT_EMAIL;

  if (!process.env.RESEND_API_KEY || !destinatario) {
    console.error("ENV faltando: RESEND_API_KEY ou CONTACT_EMAIL");
    return NextResponse.json(
      { error: "Configuração de email incompleta no servidor." },
      { status: 500 },
    );
  }

  try {
    const body = await req.json();
    const { nome, whatsapp, cargo } = body as {
      nome: string;
      whatsapp: string;
      cargo: string;
    };

    if (!nome || !whatsapp) {
      return NextResponse.json(
        { error: "Nome e WhatsApp são obrigatórios." },
        { status: 400 },
      );
    }

    const { error } = await resend.emails.send({
      from: "SIND Sistema <onboarding@resend.dev>", // ← troca pelo seu domínio verificado no Resend
      to: destinatario,
      subject: `🗳️ Nova solicitação de demo — ${nome}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
          <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 4px;">Nova solicitação de demonstração</h2>
          <p style="color: #64748b; font-size: 12px; margin-bottom: 24px;">Recebida via formulário do site SIND</p>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; width: 40%;">Nome</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; font-weight: 600;">${nome}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">WhatsApp</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; font-weight: 600;">
                <a href="https://wa.me/${whatsapp.replace(/\D/g, "")}" style="color: #2563eb; text-decoration: none;">${whatsapp}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">Cargo</td>
              <td style="padding: 12px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${cargo}</td>
            </tr>
          </table>

          <a href="https://wa.me/${whatsapp.replace(/\D/g, "")}"
            style="display: block; margin-top: 24px; background: #25d366; color: white; text-align: center; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 12px; text-decoration: none; letter-spacing: 0.05em;">
            💬 Responder no WhatsApp
          </a>

          <p style="margin-top: 24px; color: #cbd5e1; font-size: 10px; text-align: center; text-transform: uppercase; letter-spacing: 0.2em;">
            SIND — Sistema de Molduras Digitais
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Falha ao enviar email." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erro na API contato:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
