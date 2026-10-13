import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  activities,
  clientModules,
  comments,
  companySettings,
  users,
} from "@/lib/db/schema";
import type { ClientAccess } from "@/lib/data/access";
import type { Priority, Status } from "@/lib/labels";

export type ReportActivity = {
  id: string;
  parentId: string | null;
  name: string;
  status: Status;
  priority: Priority;
  assigneeName: string | null;
  clientContact: string | null;
  dueDate: string | null;
  comments: { authorName: string | null; createdAt: Date; body: string }[];
};

export type ClientReport = {
  companyName: string;
  projectName: string;
  clientName: string;
  modules: { id: string; name: string; activities: ReportActivity[] }[];
};

/**
 * Dados do relatório do cliente. Só entram comentários "para o cliente":
 * o PDF é feito para ser enviado e nunca leva comentário interno.
 */
export async function loadClientReport(
  access: ClientAccess,
  withComments: boolean,
): Promise<ClientReport> {
  const [settings] = await db.select().from(companySettings).limit(1);
  const modules = await db
    .select({ id: clientModules.id, name: clientModules.name })
    .from(clientModules)
    .where(eq(clientModules.projectClientId, access.projectClientId))
    .orderBy(asc(clientModules.position), asc(clientModules.name));

  const rows = modules.length
    ? await db
        .select({
          id: activities.id,
          clientModuleId: activities.clientModuleId,
          parentId: activities.parentId,
          name: activities.name,
          status: activities.status,
          priority: activities.priority,
          assigneeName: users.name,
          clientContact: activities.clientContact,
          dueDate: activities.dueDate,
        })
        .from(activities)
        .leftJoin(users, eq(users.id, activities.assigneeUserId))
        .where(
          inArray(
            activities.clientModuleId,
            modules.map((m) => m.id),
          ),
        )
        .orderBy(asc(activities.position), asc(activities.createdAt))
    : [];

  const commentRows =
    withComments && rows.length
      ? await db
          .select({
            activityId: comments.activityId,
            authorName: users.name,
            createdAt: comments.createdAt,
            body: comments.body,
          })
          .from(comments)
          .leftJoin(users, eq(users.id, comments.authorUserId))
          .where(
            and(
              eq(comments.visibility, "cliente"),
              inArray(
                comments.activityId,
                rows.map((r) => r.id),
              ),
            ),
          )
          .orderBy(asc(comments.createdAt))
      : [];
  const commentsBy = Map.groupBy(commentRows, (c) => c.activityId);

  // Subatividade logo depois da sua atividade-pai.
  const ordered = (list: typeof rows) => {
    const children = Map.groupBy(
      list.filter((r) => r.parentId),
      (r) => r.parentId!,
    );
    return list
      .filter((r) => !r.parentId)
      .flatMap((r) => [r, ...(children.get(r.id) ?? [])]);
  };

  return {
    companyName: settings?.name ?? "Intotum",
    projectName: access.projectName,
    clientName: access.clientName,
    modules: modules.map((m) => ({
      ...m,
      activities: ordered(rows.filter((r) => r.clientModuleId === m.id)).map(
        (a) => ({ ...a, comments: commentsBy.get(a.id) ?? [] }),
      ),
    })),
  };
}
