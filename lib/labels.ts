// Textos e cores exibidos na tela para os valores guardados no banco.
// Os textos em português vêm de lib/i18n.ts (lá também está o espanhol).

import { dictionary } from "./i18n";

const pt = dictionary("pt");

export const STATUSES = [
  "nao_iniciado",
  "iniciado",
  "concluido",
  "aguardando_cliente",
  "bloqueado",
] as const;
export type Status = (typeof STATUSES)[number];

export const statusLabel: Record<Status, string> = pt.status;

export const statusColor: Record<Status, string> = {
  nao_iniciado: "bg-slate-100 text-slate-700",
  iniciado: "bg-blue-100 text-blue-800",
  concluido: "bg-green-100 text-green-800",
  aguardando_cliente: "bg-amber-100 text-amber-800",
  bloqueado: "bg-red-100 text-red-800",
};

export const IMPLEMENTATION_STATUSES = ["iniciado", "finalizado", "cancelado"] as const;
export type ImplementationStatus = (typeof IMPLEMENTATION_STATUSES)[number];

export const implementationStatusLabel: Record<ImplementationStatus, string> =
  pt.implementationStatus;

export const implementationStatusColor: Record<ImplementationStatus, string> = {
  iniciado: "bg-blue-100 text-blue-800",
  finalizado: "bg-green-100 text-green-800",
  cancelado: "bg-slate-200 text-slate-600",
};

export const PRIORITIES = ["baixa", "media", "alta", "urgente"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const priorityLabel: Record<Priority, string> = pt.priority;

export const roleLabel = pt.role;

export const projectTypeLabel = { sistema: "Sistema", servico: "Serviço" } as const;

/** Data do banco (AAAA-MM-DD) no formato brasileiro. */
export function formatDate(value: string | null) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}
