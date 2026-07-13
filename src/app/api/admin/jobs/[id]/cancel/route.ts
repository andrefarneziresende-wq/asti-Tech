import { NextResponse } from "next/server";
import { getJob, updateJob } from "@/lib/jobs-store";
import { RUNNING_JOB_STATUSES } from "@/lib/jobs";

// Marca o job como cancelado. Não interrompe uma chamada de rede em andamento
// (Claude/navegador), mas o loop da varredura verifica esse status antes de
// processar o próximo anúncio e para nesse ponto.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);

  if (!job) {
    return NextResponse.json({ error: "Job não encontrado." }, { status: 404 });
  }

  if (!RUNNING_JOB_STATUSES.includes(job.status)) {
    return NextResponse.json({ error: "Esse job já foi finalizado." }, { status: 400 });
  }

  const updated = await updateJob(id, { status: "cancelado" }, "Cancelamento solicitado pelo usuário.");
  return NextResponse.json({ job: updated });
}
