import { FadhilCareDeskApp } from "../../../features/caredesk/ui/FadhilCareDeskApp";

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return <FadhilCareDeskApp page="job-detail" jobId={jobId} />;
}
