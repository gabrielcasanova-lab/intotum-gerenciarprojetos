import "server-only";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

/** Registra quem mudou o quê (requisito de histórico de alterações). */
export async function logAudit(
  userId: string,
  entity: string,
  entityId: string,
  action: "criar" | "alterar" | "excluir",
  changes?: Record<string, unknown>,
) {
  await db.insert(auditLog).values({ userId, entity, entityId, action, changes });
}
