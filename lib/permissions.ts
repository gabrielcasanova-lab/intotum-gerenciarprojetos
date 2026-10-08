// Regras de permissão puras (sem banco), para serem testáveis.
// Requisitos: R2, R3, R4, R12, R16, R17, R18.

export type Role = "admin" | "equipe" | "cliente";
export type Level = "visualizar" | "editar";
export type CommentVisibility = "interno" | "cliente";

export type Grant = {
  projectId: string | null;
  projectClientId: string | null;
  level: Level;
};

export type Target = {
  projectId: string;
  projectClientId: string;
};

const rank: Record<Level, number> = { visualizar: 1, editar: 2 };

/**
 * Nível de acesso de um usuário a um cliente dentro de um projeto,
 * ou null se não tiver acesso.
 */
export function accessLevel(
  role: Role,
  grants: Grant[],
  target: Target,
): Level | null {
  if (role === "admin") return "editar";

  let best: Level | null = null;
  for (const g of grants) {
    const matches =
      g.projectClientId === target.projectClientId ||
      // Usuário do cliente só pode ter vínculo no nível do cliente.
      (role !== "cliente" && g.projectId === target.projectId);
    if (matches && (best === null || rank[g.level] > rank[best])) {
      best = g.level;
    }
  }

  // Cliente nunca edita, mesmo que um vínculo diga o contrário.
  if (role === "cliente" && best !== null) return "visualizar";
  return best;
}

export function canEdit(role: Role, grants: Grant[], target: Target) {
  return accessLevel(role, grants, target) === "editar";
}

/** Quais comentários o usuário pode ler. */
export function visibleCommentTypes(role: Role): CommentVisibility[] {
  return role === "cliente" ? ["cliente"] : ["interno", "cliente"];
}

/** Só quem edita comenta; visualização e cliente apenas leem (R12). */
export function canComment(role: Role, grants: Grant[], target: Target) {
  return role !== "cliente" && canEdit(role, grants, target);
}

/** Só administrador gerencia usuários, vínculos, projetos e campos (R3). */
export function canManageSystem(role: Role) {
  return role === "admin";
}
