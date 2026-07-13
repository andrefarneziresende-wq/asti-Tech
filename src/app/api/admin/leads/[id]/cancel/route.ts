import { NextResponse } from "next/server";
import { getLead, updateLead } from "@/lib/leads-store";
import { RUNNING_LEAD_STATUSES } from "@/lib/leads";

// Marca o lead como cancelado. O pipeline em segundo plano verifica esse
// status entre as etapas (após gerar o site, antes de publicar no GitHub,
// antes de enviar o e-mail) e para nesse ponto caso já tenha sido cancelado.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  }

  if (!RUNNING_LEAD_STATUSES.includes(lead.status)) {
    return NextResponse.json({ error: "Esse lead não está com o robô em execução." }, { status: 400 });
  }

  const updated = await updateLead(id, { status: "cancelado" }, { label: "Cancelamento solicitado pelo usuário" });
  return NextResponse.json({ lead: updated });
}
