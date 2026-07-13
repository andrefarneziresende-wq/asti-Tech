import { notFound } from "next/navigation";
import { getJob } from "@/lib/jobs-store";
import { JobLiveView } from "./JobLiveView";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);

  if (!job) notFound();

  return <JobLiveView initialJob={job} />;
}
