import { NextResponse } from "next/server";
import { getJob, updateJob } from "@/lib/jobs-store";
import { isJobStale } from "@/lib/jobs";

// Chamado quando a tela detecta que um job ficou tempo demais sem nenhuma
// atualização enquanto "rodando" — sinal de que a função foi encerrada pela
// plataforma antes de conseguir registrar um erro.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);

  if (!job) {
    return NextResponse.json({ error: "Job não encontrado." }, { status: 404 });
  }

  if (!isJobStale(job)) {
    return NextResponse.json({ error: "Esse job não parece estar travado." }, { status: 400 });
  }

  const updated = await updateJob(
    id,
    { status: "erro", errorMessage: "Processo interrompido sem aviso, provavelmente pela plataforma." },
    "Marcado como travado: sem nenhuma atualização por tempo suficiente — a função provavelmente foi encerrada pela plataforma antes de registrar um erro. Pode rodar a varredura de novo."
  );

  return NextResponse.json({ job: updated });
}
