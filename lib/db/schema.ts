import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// IDs são gerados na aplicação (crypto.randomUUID) para não depender de
// funções do PostgreSQL que podem não existir na versão do cPanel.
const id = () =>
  uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// ---------- Enums ----------

/** Perfil global do usuário (requisitos R2, R3, R16). */
export const userRole = pgEnum("user_role", ["admin", "equipe", "cliente"]);

/** Nível de acesso dado por um vínculo (R2, R4). */
export const accessLevel = pgEnum("access_level", ["visualizar", "editar"]);

/** Status fixos para todos os projetos (R15). */
export const activityStatus = pgEnum("activity_status", [
  "nao_iniciado",
  "iniciado",
  "concluido",
  "aguardando_cliente",
  "bloqueado",
]);

export const priority = pgEnum("priority", ["baixa", "media", "alta", "urgente"]);

/** Comentário interno (só equipe) ou visível ao cliente (R18). */
export const commentVisibility = pgEnum("comment_visibility", [
  "interno",
  "cliente",
]);

export const projectType = pgEnum("project_type", ["sistema", "servico"]);

export const customFieldType = pgEnum("custom_field_type", [
  "texto",
  "texto_longo",
  "numero",
  "data",
  "lista",
  "caixa_selecao",
  "usuario",
]);

// ---------- Configuração ----------

/** Registro único com os dados da Intotum (R10). */
export const companySettings = pgTable("company_settings", {
  id: integer("id").primaryKey().default(1),
  name: text("name").notNull(),
  logoPath: text("logo_path"),
});

// ---------- Usuários e acesso ----------

export const users = pgTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  // Nulo enquanto o convite não foi aceito.
  passwordHash: text("password_hash"),
  role: userRole("role").notNull(),
  active: boolean("active").notNull().default(true),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: createdAt(),
});

/** O id é o SHA-256 do token do cookie; o token em si nunca é gravado. */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/**
 * Links de uso único enviados por e-mail: convite (criar a primeira senha)
 * e redefinição de senha. O id é o SHA-256 do token; o token só vai no e-mail.
 */
export const userTokenPurpose = pgEnum("user_token_purpose", [
  "convite",
  "redefinir",
]);

export const userTokens = pgTable(
  "user_tokens",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: userTokenPurpose("purpose").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("user_tokens_user_idx").on(t.userId)],
);

// ---------- Hierarquia ----------

export const projects = pgTable("projects", {
  id: id(),
  name: text("name").notNull(),
  type: projectType("type").notNull().default("sistema"),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  allowSubactivities: boolean("allow_subactivities").notNull().default(false),
  createdAt: createdAt(),
});

/** Cliente cadastrado uma vez; ligado a projetos por project_clients (R11). */
export const clients = pgTable("clients", {
  id: id(),
  name: text("name").notNull(),
  cnpj: text("cnpj"),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  createdAt: createdAt(),
});

export const projectClients = pgTable(
  "project_clients",
  {
    id: id(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [unique("project_clients_unique").on(t.projectId, t.clientId)],
);

/**
 * Vínculo de acesso: no projeto inteiro OU num cliente dentro do projeto.
 * Exatamente um dos dois é preenchido.
 */
export const accessGrants = pgTable(
  "access_grants",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    projectClientId: uuid("project_client_id").references(
      () => projectClients.id,
      { onDelete: "cascade" },
    ),
    level: accessLevel("level").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    check(
      "access_grants_one_scope",
      sql`(${t.projectId} IS NULL) <> (${t.projectClientId} IS NULL)`,
    ),
    index("access_grants_user_idx").on(t.userId),
  ],
);

/** Catálogo de módulos do projeto (Estoque, Vendas...). */
export const moduleCatalog = pgTable("module_catalog", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
});

/** Atividades padrão criadas ao ativar o módulo num cliente. */
export const moduleTemplateActivities = pgTable("module_template_activities", {
  id: id(),
  moduleCatalogId: uuid("module_catalog_id")
    .notNull()
    .references(() => moduleCatalog.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
});

/** Módulo ativado num cliente de um projeto. */
export const clientModules = pgTable("client_modules", {
  id: id(),
  projectClientId: uuid("project_client_id")
    .notNull()
    .references(() => projectClients.id, { onDelete: "cascade" }),
  moduleCatalogId: uuid("module_catalog_id").references(() => moduleCatalog.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  position: integer("position").notNull().default(0),
  createdAt: createdAt(),
});

export const activities = pgTable(
  "activities",
  {
    id: id(),
    clientModuleId: uuid("client_module_id")
      .notNull()
      .references(() => clientModules.id, { onDelete: "cascade" }),
    // Subatividade quando preenchido (só se o projeto permitir, R14).
    parentId: uuid("parent_id").references((): AnyPgColumn => activities.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    description: text("description"),
    status: activityStatus("status").notNull().default("nao_iniciado"),
    priority: priority("priority").notNull().default("media"),
    assigneeUserId: uuid("assignee_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    clientContact: text("client_contact"),
    startDate: date("start_date"),
    dueDate: date("due_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index("activities_module_idx").on(t.clientModuleId),
    index("activities_parent_idx").on(t.parentId),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: id(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    visibility: commentVisibility("visibility").notNull(),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("comments_activity_idx").on(t.activityId)],
);

export const attachments = pgTable("attachments", {
  id: id(),
  activityId: uuid("activity_id")
    .notNull()
    .references(() => activities.id, { onDelete: "cascade" }),
  uploadedBy: uuid("uploaded_by").references(() => users.id, {
    onDelete: "set null",
  }),
  fileName: text("file_name").notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  createdAt: createdAt(),
});

// ---------- Campos personalizados (R7, R8) ----------

export const customFields = pgTable("custom_fields", {
  id: id(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: customFieldType("type").notNull(),
  // Opções da lista suspensa, quando type = 'lista'.
  options: jsonb("options").$type<string[]>(),
  required: boolean("required").notNull().default(false),
  position: integer("position").notNull().default(0),
});

export const customFieldValues = pgTable(
  "custom_field_values",
  {
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    customFieldId: uuid("custom_field_id")
      .notNull()
      .references(() => customFields.id, { onDelete: "cascade" }),
    value: jsonb("value"),
  },
  (t) => [primaryKey({ columns: [t.activityId, t.customFieldId] })],
);

// ---------- Histórico ----------

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    changes: jsonb("changes"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_log_entity_idx").on(t.entity, t.entityId)],
);
