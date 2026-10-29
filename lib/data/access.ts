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
import type { ImplementationStatus } from "@/lib/labels";
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

export type ClientAccess = {
  projectClientId: string;
  projectId: string;
  projectName: string;
  allowSubactivities: boolean;
  clientId: string;
  clientName: string;
  status: ImplementationStatus;
  level: Level;
};

/**
 * Carrega um cliente dentro de um projeto e confere o acesso do usuário.
 * Retorna null se não existir ou se o usuário não puder ver (a página trata
 * os dois casos igual, para não revelar o que existe).
 */
export async function getClientAccess(
  user: SessionUser,
  projectClientId: string,
): Promise<ClientAccess | null> {
  if (!isUuid(projectClientId)) return null;

  const [row] = await db
    .select({
      projectClientId: projectClients.id,
      projectId: projects.id,
      projectName: projects.name,
      allowSubactivities: projects.allowSubactivities,
      clientId: clients.id,
      clientName: clients.name,
      status: projectClients.status,
    })
    .from(projectClients)
    .innerJoin(projects, eq(projects.id, projectClients.projectId))
    .innerJoin(clients, eq(clients.id, projectClients.clientId))
    .where(eq(projectClients.id, projectClientId))
    .limit(1);
  if (!row) return null;

  const level = accessLevel(user.role, await loadGrants(user.id), row);
  return level ? { ...row, level } : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Evita erro do PostgreSQL ao comparar um texto qualquer da URL com uma coluna uuid. */
export function isUuid(value: string) {
  return UUID.test(value);
}

export type VisibleClient = {
  projectClientId: string;
  projectId: string;
  projectName: string;
  clientName: string;
  status: ImplementationStatus;
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
        status: projectClients.status,
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
