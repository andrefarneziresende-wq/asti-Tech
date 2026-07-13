import { NextRequest, NextResponse, after } from "next/server";
import { createLead, listLeads } from "@/lib/leads-store";
import { scanListingUrl, estimateMonthlyCost, MAX_LISTING_LEADS } from "@/lib/pipeline";
import { assertPublicHttpUrl } from "@/lib/fetch-page";

export const maxDuration = 60;

async function runListingScan(listingUrl: string) {
  const existing = await listLeads();
  const existingUrls = new Set(existing.map((lead) => lead.sourceUrl));

  try {
    await scanListingUrl(listingUrl, async (item) => {
      if (existingUrls.has(item.sourceUrl)) return;
      await createLead({
        sourceUrl: item.sourceUrl,
        businessName: item.businessName,
        segment: item.segment,
        contactEmail: item.contactEmail,
        contactPhone: item.contactPhone,
        estimatedMonthlyCost: estimateMonthlyCost(item),
      });
      existingUrls.add(item.sourceUrl);
    });
  } catch (err) {
    console.error("Falha na varredura de listagem:", err);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const listingUrl = typeof body?.listingUrl === "string" ? body.listingUrl.trim() : "";

  if (!listingUrl) {
    return NextResponse.json({ error: "Informe a URL da lista de anúncios." }, { status: 400 });
  }

  try {
    assertPublicHttpUrl(listingUrl);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "URL inválida." },
      { status: 400 }
    );
  }

  after(() => runListingScan(listingUrl));

  return NextResponse.json(
    { started: true, maxLeads: MAX_LISTING_LEADS },
    { status: 202 }
  );
}
