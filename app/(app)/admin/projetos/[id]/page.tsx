import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { asc, eq, ne, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  clients,
  moduleCatalog,
  moduleTemplateActivities,
  projectClients,
  projects,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/dal";
import { isUuid } from "@/lib/data/access";
import * as ui from "@/lib/ui/styles";
import { ConfirmButton } from "@/components/confirm-button";
import { StickySelect } from "@/components/sticky-select";
import { MoveButtons } from "@/components/move-buttons";
import { LANGUAGES, languageName, type Language } from "@/lib/i18n";
import {
  addClientToProject,
  addModule,
  addTemplateActivity,
  copyModulesFrom,
  deleteModule,
  deleteProject,
  deleteTemplateActivity,
  moveModule,
  renameModule,
  renameTemplateActivity,
  unlinkClient,
  updateClient,
  updateProject,
} from "../actions";

/** Idioma do cliente: o do PDF e o dos usuários desse cliente. */
function LanguageField({ defaultValue }: { defaultValue: Language }) {
  return (
    <label className={ui.label}>
      Idioma (PDF e usuários do cliente)
      <select name="language" defaultValue={defaultValue} className={ui.input}>
        {LANGUAGES.map((l) => (
          <option key={l} value={l}>
            {languageName[l]}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Campo opcional com o nome usado nos clientes em espanhol. */
function SpanishNameInput({ value, of }: { value: string | null; of: string }) {
  return (
    <input
      name="nameEs"
      maxLength={200}
      defaultValue={value ?? ""}
      placeholder="Nome em espanhol (opcional)"
      aria-label={`Nome em espanhol de ${of}`}
      className={`${ui.input} flex-1`}
    />
  );
}

/** Uma atividade padrão do catálogo: nome, renomear e excluir. */
function TemplateItem({ t }: { t: { id: string; name: string; nameEs: string | null } }) {
  return (
    <div>
      {/* O botão "excluir" fica na linha do nome e envia este formulário (atributo form). */}
      <form id={`excluir-${t.id}`} action={deleteTemplateActivity} hidden>
        <input type="hidden" name="templateId" value={t.id} />
      </form>
      <details>
        <summary className="inline-flex cursor-pointer list-none items-center gap-2">
          {t.name}
          {t.nameEs && <span className="text-xs text-slate-500">ES: {t.nameEs}</span>}
          <span className="text-xs text-blue-700 hover:underline">
            renomear
          </span>
          <button
            form={`excluir-${t.id}`}
            className="text-xs text-red-700 hover:underline"
            aria-label={`Excluir ${t.name}`}
          >
            excluir
          </button>
        </summary>
        <form
          key={`${t.name}|${t.nameEs}`}
          action={renameTemplateActivity}
          className="my-1 flex flex-wrap gap-2"
        >
          <input type="hidden" name="templateId" value={t.id} />
          <input
            name="name"
            required
            maxLength={200}
            defaultValue={t.name}
            aria-label={`Novo nome de ${t.name}`}
            className={`${ui.input} flex-1`}
          />
          <SpanishNameInput value={t.nameEs} of={t.name} />
          <button className={ui.buttonSecondary}>Salvar</button>
        </form>
      </details>
    </div>
  );
}

async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) notFound();

  const [modules, templates, linked] = await Promise.all([
    db
      .select()
      .from(moduleCatalog)
      .where(eq(moduleCatalog.projectId, id))
      .orderBy(asc(moduleCatalog.position)),
    db
      .select({
        id: moduleTemplateActivities.id,
        moduleCatalogId: moduleTemplateActivities.moduleCatalogId,
        parentId: moduleTemplateActivities.parentId,
        name: moduleTemplateActivities.name,
        nameEs: moduleTemplateActivities.nameEs,
      })
      .from(moduleTemplateActivities)
      .innerJoin(
        moduleCatalog,
        eq(moduleCatalog.id, moduleTemplateActivities.moduleCatalogId),
      )
      .where(eq(moduleCatalog.projectId, id))
      .orderBy(asc(moduleTemplateActivities.position)),
    db
      .select({
        projectClientId: projectClients.id,
        clientId: clients.id,
        name: clients.name,
        cnpj: clients.cnpj,
        contactName: clients.contactName,
        email: clients.email,
        phone: clients.phone,
        language: clients.language,
      })
      .from(projectClients)
      .innerJoin(clients, eq(clients.id, projectClients.clientId))
      .where(eq(projectClients.projectId, id))
      .orderBy(asc(clients.name)),
  ]);

  const otherProjects = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(ne(projects.id, id))
    .orderBy(asc(projects.name));

  const linkedIds = linked.map((c) => c.clientId);
  const otherClients = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(linkedIds.length ? notInArray(clients.id, linkedIds) : undefined)
    .orderBy(asc(clients.name));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/projetos" className="text-sm text-blue-700 hover:underline">
          ← Projetos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{project.name}</h1>
      </div>

      {/* Dados do projeto */}
      <form action={updateProject} className={`${ui.card} flex flex-col gap-3 p-4`}>
        <h2 className="font-semibold">Dados do projeto</h2>
        <input type="hidden" name="id" value={project.id} />
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className={ui.label}>
            Nome
            <input
              name="name"
              required
              maxLength={200}
              defaultValue={project.name}
              className={ui.input}
            />
          </label>
          <label className={ui.label}>
            Tipo
            <select name="type" defaultValue={project.type} className={ui.input}>
              <option value="sistema">Sistema</option>
              <option value="servico">Serviço</option>
            </select>
          </label>
        </div>
        <label className={ui.label}>
          Descrição
          <textarea
            name="description"
            rows={2}
            defaultValue={project.description ?? ""}
            className={ui.input}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="allowSubactivities"
            defaultChecked={project.allowSubactivities}
          />
          Permitir subatividades
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={project.active} />
          Projeto ativo
        </label>
        <div>
          <button className={ui.button}>Salvar</button>
        </div>
      </form>

      {/* Clientes */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Clientes</h2>
        {linked.length > 0 ? (
          <ul className={`${ui.card} divide-y divide-slate-200`}>
            {linked.map((c) => (
              <li key={c.projectClientId} className="px-4 py-2">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/c/${c.projectClientId}`} className="hover:underline">
                    {c.name}
                  </Link>
                  <form action={unlinkClient}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input
                      type="hidden"
                      name="projectClientId"
                      value={c.projectClientId}
                    />
                    <ConfirmButton
                      className={ui.buttonDanger}
                      message={`Remover ${c.name} deste projeto? Os módulos e atividades dele neste projeto serão apagados.`}
                    >
                      Remover
                    </ConfirmButton>
                  </form>
                </div>
                <details className="mt-1">
                  <summary className="cursor-pointer text-sm text-blue-700 hover:underline">
                    Editar dados
                  </summary>
                  {/* key: depois de salvar, o formulário volta com os dados novos. */}
                  <form
                    key={[c.name, c.cnpj, c.contactName, c.email, c.phone, c.language].join("|")}
                    action={updateClient}
                    className="mt-2 flex flex-col gap-3"
                  >
                    <input type="hidden" name="clientId" value={c.clientId} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          ["name", "Nome", c.name, 200],
                          ["cnpj", "CNPJ", c.cnpj, 30],
                          ["contactName", "Contato principal", c.contactName, 200],
                          ["email", "E-mail", c.email, 200],
                          ["phone", "Telefone", c.phone, 50],
                        ] as const
                      ).map(([name, label, value, max]) => (
                        <label key={name} className={ui.label}>
                          {label}
                          <input
                            name={name}
                            type={name === "email" ? "email" : "text"}
                            required={name === "name"}
                            maxLength={max}
                            defaultValue={value ?? ""}
                            className={ui.input}
                          />
                        </label>
                      ))}
                      <LanguageField defaultValue={c.language} />
                    </div>
                    <p className="text-xs text-slate-500">
                      O cadastro é único: a alteração vale em todos os projetos deste cliente.
                    </p>
                    <div>
                      <button className={ui.button}>Salvar dados</button>
                    </div>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">Nenhum cliente neste projeto.</p>
        )}

        <form
          action={addClientToProject}
          className={`${ui.card} flex flex-col gap-3 p-4`}
        >
          <h3 className="font-medium">Adicionar cliente</h3>
          <input type="hidden" name="projectId" value={project.id} />
          {otherClients.length > 0 && (
            <label className={ui.label}>
              Cliente já cadastrado
              <select name="existingClientId" defaultValue="" className={ui.input}>
                <option value="">— Cadastrar um novo (preencha abaixo) —</option>
                {otherClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {otherClients.length === 0 && (
            <input type="hidden" name="existingClientId" value="" />
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={ui.label}>
              Nome do novo cliente
              <input name="name" maxLength={200} className={ui.input} />
            </label>
            <label className={ui.label}>
              CNPJ
              <input name="cnpj" maxLength={30} className={ui.input} />
            </label>
            <label className={ui.label}>
              Contato principal
              <input name="contactName" maxLength={200} className={ui.input} />
            </label>
            <label className={ui.label}>
              E-mail
              <input name="email" type="email" maxLength={200} className={ui.input} />
            </label>
            <label className={ui.label}>
              Telefone
              <input name="phone" maxLength={50} className={ui.input} />
            </label>
            <LanguageField defaultValue="pt" />
          </div>
          <div>
            <button className={ui.button}>Adicionar cliente</button>
          </div>
        </form>
      </section>

      {/* Catálogo de módulos */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Módulos e atividades padrão</h2>
          <p className="text-sm text-slate-600">
            Ao ativar um módulo num cliente, as atividades padrão são criadas
            automaticamente. Em clientes em espanhol, entram com o nome em espanhol
            quando ele estiver preenchido.
          </p>
        </div>
        {modules.map((m, i) => (
          <div key={m.id} className={`${ui.card} flex flex-col gap-2 p-4`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MoveButtons
                  action={moveModule}
                  fields={{ moduleId: m.id }}
                  name={m.name}
                  first={i === 0}
                  last={i === modules.length - 1}
                />
                <h3 className="font-medium">
                  {m.name}
                  {m.nameEs && (
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      ES: {m.nameEs}
                    </span>
                  )}
                </h3>
              </div>
              <form action={deleteModule}>
                <input type="hidden" name="moduleId" value={m.id} />
                <ConfirmButton
                  className={ui.buttonDanger}
                  message={`Excluir o módulo ${m.name} do catálogo? Clientes que já usam o módulo não perdem nada.`}
                >
                  Excluir módulo
                </ConfirmButton>
              </form>
            </div>
            <details>
              <summary className="cursor-pointer text-sm text-blue-700 hover:underline">
                Renomear / nome em espanhol
              </summary>
              <form
                key={`${m.name}|${m.nameEs}`}
                action={renameModule}
                className="mt-2 flex flex-wrap gap-2"
              >
                <input type="hidden" name="moduleId" value={m.id} />
                <input
                  name="name"
                  required
                  maxLength={200}
                  defaultValue={m.name}
                  aria-label={`Novo nome de ${m.name}`}
                  className={`${ui.input} flex-1`}
                />
                <SpanishNameInput value={m.nameEs} of={m.name} />
                <button className={ui.buttonSecondary}>Salvar nome</button>
              </form>
              <p className="mt-1 text-xs text-slate-500">
                Os clientes que já usam este módulo passam a ver o nome novo. Clientes
                em espanhol recebem o nome em espanhol (vale também para as atividades
                padrão: clique em &quot;renomear&quot; em cada uma).
              </p>
            </details>
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
              {templates
                .filter((t) => t.moduleCatalogId === m.id && !t.parentId)
                .map((t) => {
                  const subs = templates.filter((sub) => sub.parentId === t.id);
                  return (
                    <li key={t.id}>
                      <TemplateItem t={t} />
                      {subs.length > 0 && (
                        <ul className="mt-1 flex flex-col gap-1 pl-4">
                          {subs.map((sub) => (
                            <li key={sub.id} className="flex gap-1">
                              <span className="text-slate-400">↳</span>
                              <TemplateItem t={sub} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
            </ol>
            <form action={addTemplateActivity} className="flex flex-wrap gap-2">
              <input type="hidden" name="moduleCatalogId" value={m.id} />
              <input
                name="name"
                required
                maxLength={200}
                placeholder="Nova atividade padrão"
                aria-label={`Nova atividade padrão em ${m.name}`}
                className={`${ui.input} min-w-48 flex-1`}
              />
              {project.allowSubactivities &&
                templates.some((t) => t.moduleCatalogId === m.id && !t.parentId) && (
                  <StickySelect
                    name="parentId"
                    defaultValue=""
                    aria-label={`Dentro de (${m.name})`}
                    className={ui.input}
                  >
                    <option value="">Atividade principal</option>
                    {templates
                      .filter((t) => t.moduleCatalogId === m.id && !t.parentId)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          Subatividade de: {t.name}
                        </option>
                      ))}
                  </StickySelect>
                )}
              <button className={ui.buttonSecondary}>Adicionar</button>
            </form>
          </div>
        ))}
        <form action={addModule} className="flex gap-2">
          <input type="hidden" name="projectId" value={project.id} />
          <input
            name="name"
            required
            maxLength={2000}
            placeholder="Um ou vários, separados por vírgula (ex.: Estoque, Vendas)"
            className={`${ui.input} flex-1`}
          />
          <button className={ui.button}>Adicionar módulo</button>
        </form>
        {otherProjects.length > 0 && (
          <form action={copyModulesFrom} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="projectId" value={project.id} />
            <label className={`${ui.label} min-w-48 flex-1`}>
              Copiar módulos e atividades padrão de outro projeto
              <select name="sourceProjectId" required defaultValue="" className={ui.input}>
                <option value="" disabled>
                  — escolha o projeto —
                </option>
                {otherProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button className={ui.buttonSecondary}>Copiar módulos</button>
            <p className="w-full text-xs text-slate-500">
              Módulos com o mesmo nome que já existem aqui não são copiados de novo.
            </p>
          </form>
        )}
      </section>
      {/* Excluir projeto: só sem clientes, para não apagar histórico por engano. */}
      <section className={`${ui.card} flex flex-col gap-2 border-red-200 p-4`}>
        <h2 className="font-semibold text-red-800">Excluir projeto</h2>
        {linked.length > 0 ? (
          <p className="text-sm text-slate-600">
            Este projeto tem {linked.length === 1 ? "1 cliente" : `${linked.length} clientes`}.
            Para excluir, remova antes os clientes dele (botão &quot;Remover&quot; em
            Clientes). Para só esconder, desmarque &quot;Projeto ativo&quot; acima.
          </p>
        ) : (
          <form action={deleteProject}>
            <input type="hidden" name="projectId" value={project.id} />
            <ConfirmButton
              className={ui.buttonDanger}
              message={`Excluir o projeto ${project.name}? O catálogo de módulos e os acessos dados ao projeto também serão apagados. Não tem volta.`}
            >
              Excluir projeto
            </ConfirmButton>
          </form>
        )}
      </section>
    </div>
  );
}

export default function ProjectPage({ params }: PageProps<"/admin/projetos/[id]">) {
  return (
    <Suspense fallback={<p className="text-slate-500">Carregando…</p>}>
      <ProjectDetail params={params} />
    </Suspense>
  );
}
