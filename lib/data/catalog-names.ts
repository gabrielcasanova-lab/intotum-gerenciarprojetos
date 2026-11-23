import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  activities,
  clientModules,
  clients,
  moduleCatalog,
  moduleTemplateActivities,
  projectClients,
} from "@/lib/db/schema";
import { catalogName, type NamedItem } from "@/lib/catalog-names";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Acerta os nomes de módulos e atividades que vieram do catálogo para o
 * idioma de cada cliente. Só mexe no que ainda tem um nome do catálogo
 * (o antigo, em português ou em espanhol): o que a equipe renomeou à mão fica.
 *
 * `previous` traz os nomes antigos de itens do catálogo que acabaram de mudar
 * (para achar quem ainda usa o nome anterior).
 */
export async function syncCatalogNames(
  tx: Tx,
  where: { projectClientIds?: string[]; moduleCatalogIds?: string[] },
  previous: Map<string, NamedItem> = new Map(),
) {
  const filter = where.projectClientIds
    ? inArray(clientModules.projectClientId, where.projectClientIds)
    : inArray(clientModules.moduleCatalogId, where.moduleCatalogIds ?? []);
  if ((where.projectClientIds ?? where.moduleCatalogIds ?? []).length === 0) return;

  const mods = await tx
    .select({
      id: clientModules.id,
      name: clientModules.name,
      catalogId: clientModules.moduleCatalogId,
      language: clients.language,
    })
    .from(clientModules)
    .innerJoin(projectClients, eq(projectClients.id, clientModules.projectClientId))
    .innerJoin(clients, eq(clients.id, projectClients.clientId))
    .where(filter);
  const linked = mods.filter((m) => m.catalogId);
  if (linked.length === 0) return;
  const catalogIds = [...new Set(linked.map((m) => m.catalogId!))];

  const [catalog, templates, acts] = await Promise.all([
    tx.select().from(moduleCatalog).where(inArray(moduleCatalog.id, catalogIds)),
    tx
      .select()
      .from(moduleTemplateActivities)
      .where(inArray(moduleTemplateActivities.moduleCatalogId, catalogIds)),
    tx
      .select({
        id: activities.id,
        name: activities.name,
        clientModuleId: activities.clientModuleId,
      })
      .from(activities)
      .where(
        inArray(
          activities.clientModuleId,
          linked.map((m) => m.id),
        ),
      ),
  ]);
  const catalogById = new Map(catalog.map((c) => [c.id, c]));

  /** Nome novo para quem ainda usa um dos nomes (atuais ou anteriores) do item. */
  const rename = (current: string, item: NamedItem, language: "pt" | "es") => {
    const old = previous.get(item.id);
    const known = [item.name, item.nameEs, old?.name, old?.nameEs].filter(Boolean);
    const target = catalogName(item, language);
    return known.includes(current) && current !== target ? target : null;
  };

  for (const m of linked) {
    const cat = catalogById.get(m.catalogId!);
    if (!cat) continue;
    const newName = rename(m.name, cat, m.language);
    if (newName) {
      await tx.update(clientModules).set({ name: newName }).where(eq(clientModules.id, m.id));
    }
    const tpls = templates.filter((t) => t.moduleCatalogId === cat.id);
    for (const a of acts.filter((a) => a.clientModuleId === m.id)) {
      for (const t of tpls) {
        const n = rename(a.name, t, m.language);
        if (n) {
          await tx.update(activities).set({ name: n }).where(eq(activities.id, a.id));
          break;
        }
      }
    }
  }
}
