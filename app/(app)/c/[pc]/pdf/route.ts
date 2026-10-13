import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getClientAccess } from "@/lib/data/access";
import { loadClientReport } from "@/lib/data/report";
import { renderClientReport } from "@/lib/pdf/client-report";
import { todayInBrazil } from "@/lib/progress";

/** PDF do andamento do cliente, para enviar a ele (sem comentários internos). */
export async function GET(
  request: Request,
  { params }: RouteContext<"/c/[pc]/pdf">,
) {
  const user = await getCurrentUser();
  const { pc } = await params;
  const access = await getClientAccess(user, pc);
  if (!access) notFound();

  const withComments =
    new URL(request.url).searchParams.get("comentarios") === "1";
  const report = await loadClientReport(access, withComments);
  const now = new Date();
  const pdf = await renderClientReport(report, todayInBrazil(now), now);

  const fileName = `Andamento - ${access.clientName} - ${todayInBrazil(now)}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
