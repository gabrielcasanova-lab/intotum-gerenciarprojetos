import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSessionUser } from "./session";

/**
 * Camada de acesso: toda página e ação protegida passa por aqui.
 * cache() evita ler a sessão mais de uma vez na mesma requisição.
 */
export const getCurrentUser = cache(async () => {
  const user = await readSessionUser();
  if (!user) redirect("/login");
  return user;
});

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/");
  return user;
}
