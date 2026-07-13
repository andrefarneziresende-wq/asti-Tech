import { NextRequest, NextResponse } from "next/server";
import { listLeads, createLead } from "@/lib/leads-store";
import { scanClassifiedUrl, estimateMonthlyCost } from "@/lib/pipeline";

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

  const found = await scanClassifiedUrl(sourceUrl);
  const created = [];
  for (const item of found) {
    const lead = await createLead({
      sourceUrl: item.sourceUrl,
      businessName: item.businessName,
      segment: item.segment,
      estimatedMonthlyCost: estimateMonthlyCost(item),
    });
    created.push(lead);
  }

  return NextResponse.json({ leads: created });
}
