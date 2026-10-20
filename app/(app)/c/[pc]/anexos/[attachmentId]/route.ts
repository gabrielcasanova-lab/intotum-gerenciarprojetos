import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities, attachments, clientModules } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { getClientAccess, isUuid } from "@/lib/data/access";
import { visibleCommentTypes } from "@/lib/permissions";
import { contentDisposition, isInlineType, readUpload } from "@/lib/uploads";

/** Baixa um anexo; o cliente só alcança os anexos marcados como visíveis a ele. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/c/[pc]/anexos/[attachmentId]">,
) {
  const user = await getCurrentUser();
  const { pc, attachmentId } = await params;
  if (!isUuid(attachmentId)) notFound();
  const access = await getClientAccess(user, pc);
  if (!access) notFound();

  const [file] = await db
    .select({
      fileName: attachments.fileName,
      storagePath: attachments.storagePath,
      mimeType: attachments.mimeType,
    })
    .from(attachments)
    .innerJoin(activities, eq(activities.id, attachments.activityId))
    .innerJoin(clientModules, eq(clientModules.id, activities.clientModuleId))
    .where(
      and(
        eq(attachments.id, attachmentId),
        eq(clientModules.projectClientId, pc),
        inArray(attachments.visibility, visibleCommentTypes(user.role)),
      ),
    );
  if (!file) notFound();

  let content: Buffer;
  try {
    content = await readUpload(file.storagePath);
  } catch (error) {
    console.error("Anexo não encontrado no disco:", error);
    notFound();
  }

  const inline = isInlineType(file.mimeType);
  return new Response(new Uint8Array(content), {
    headers: {
      // Só PDF e imagens abrem na aba; o resto vai como download genérico.
      "Content-Type": inline ? file.mimeType! : "application/octet-stream",
      "Content-Disposition": contentDisposition(file.fileName, inline),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
