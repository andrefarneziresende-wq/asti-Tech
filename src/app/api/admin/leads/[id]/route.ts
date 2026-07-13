import { NextResponse } from "next/server";
import { getLead, updateLead } from "@/lib/leads-store";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  return NextResponse.json({ lead });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const allowed = ["businessName", "segment", "contactEmail", "contactPhone", "status"] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const lead = await updateLead(id, patch, { label: "Lead atualizado manualmente" });
  if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  return NextResponse.json({ lead });
}
