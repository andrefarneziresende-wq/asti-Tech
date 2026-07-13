import { NextRequest, NextResponse } from "next/server";
import { listLeads, createLead } from "@/lib/leads-store";
import { scanClassifiedUrl, estimateMonthlyCost } from "@/lib/pipeline";
import { withTimeout } from "@/lib/timeout";

// Renderizar a página num navegador real (necessário pra sites que carregam
// o anúncio via JavaScript) pode levar mais que o padrão de uma função.
export const maxDuration = 60;

// Deixa uma margem antes do limite da função, pra devolver uma mensagem de
// erro clara em vez de deixar a Vercel encerrar a conexão sem aviso quando o
// site de destino está fora do ar ou muito lento.
const SCAN_TIMEOUT_MS = 45000;

export async function GET() {
  const leads = await listLeads();
  return NextResponse.json({ leads });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sourceUrl = typeof body?.sourceUrl === "string" ? body.sourceUrl.trim() : "";

  if (!sourceUrl) {
    return NextResponse.json({ error: "Informe a URL do classificado/anúncio." }, { status: 400 });
  }

  let found;
  try {
    found = await withTimeout(
      scanClassifiedUrl(sourceUrl),
      SCAN_TIMEOUT_MS,
      "Tempo esgotado ao escanear essa URL (mais de 45s). O site pode estar fora do ar ou muito lento."
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao escanear a URL." },
      { status: 422 }
    );
  }

  const created = [];
  for (const item of found) {
    const lead = await createLead({
      sourceUrl: item.sourceUrl,
      businessName: item.businessName,
      segment: item.segment,
      contactEmail: item.contactEmail,
      contactPhone: item.contactPhone,
      businessDescription: item.businessDescription,
      logoUrl: item.logoUrl,
      brandColors: item.brandColors,
      estimatedMonthlyCost: estimateMonthlyCost(item),
    });
    created.push(lead);
  }

  return NextResponse.json({ leads: created });
}
