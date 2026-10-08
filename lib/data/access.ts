import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accessGrants,
  clients,
  projectClients,
  projects,
} from "@/lib/db/schema";
import { accessLevel, type Grant, type Level } from "@/lib/permissions";
import type { SessionUser } from "@/lib/auth/session";

export async function loadGrants(userId: string): Promise<Grant[]> {
  return db
    .select({
      projectId: accessGrants.projectId,
      projectClientId: accessGrants.projectClientId,
      level: accessGrants.level,
    })
    .from(accessGrants)
    .where(eq(accessGrants.userId, userId));
}

export type VisibleClient = {
  projectClientId: string;
  projectId: string;
  projectName: string;
  clientName: string;
  level: Level;
};

/** Clientes (dentro de projetos) que o usuário pode ver, com o nível de acesso. */
export async function listVisibleClients(
  user: SessionUser,
): Promise<VisibleClient[]> {
  const [grants, rows] = await Promise.all([
    loadGrants(user.id),
    db
      .select({
        projectClientId: projectClients.id,
        projectId: projects.id,
        projectName: projects.name,
        clientName: clients.name,
      })
      .from(projectClients)
      .innerJoin(projects, eq(projects.id, projectClients.projectId))
      .innerJoin(clients, eq(clients.id, projectClients.clientId))
      .where(eq(projects.active, true))
      .orderBy(asc(projects.name), asc(clients.name)),
  ]);

  return rows.flatMap((r) => {
    const level = accessLevel(user.role, grants, r);
    return level ? [{ ...r, level }] : [];
  });
}
