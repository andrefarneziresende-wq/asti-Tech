import { NextResponse } from "next/server";
import { getLead, updateLead } from "@/lib/leads-store";
import { isLeadStale } from "@/lib/leads";

// Chamado quando a tela detecta que um lead ficou tempo demais sem nenhuma
// atualização enquanto "rodando" — sinal de que a função foi encerrada pela
// plataforma antes de conseguir registrar um erro. Marca como erro com uma
// explicação clara, em vez de deixar o lead preso num status enganoso.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  }

  if (!isLeadStale(lead)) {
    return NextResponse.json({ error: "Esse lead não parece estar travado." }, { status: 400 });
  }

  const updated = await updateLead(
    id,
    { status: "erro" },
    {
      label: "Processo interrompido",
      detail:
        "Sem nenhuma atualização por tempo suficiente — a função provavelmente foi encerrada pela plataforma antes de registrar um erro (ex: durante uma instabilidade ou um deploy). Não é um problema com os dados desse lead; pode rodar o robô de novo.",
    }
  );

  return NextResponse.json({ lead: updated });
}
