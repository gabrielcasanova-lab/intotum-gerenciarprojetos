import type { Status } from "./labels";

/** Percentual de atividades concluídas (0 a 100, inteiro). Lista vazia = 0. */
export function percentDone(statuses: Status[]) {
  if (statuses.length === 0) return 0;
  const done = statuses.filter((s) => s === "concluido").length;
  return Math.round((done / statuses.length) * 100);
}

/** Atividade atrasada: tem vencimento no passado e não foi concluída. */
export function isOverdue(
  dueDate: string | null,
  status: Status,
  today: string,
) {
  return dueDate !== null && status !== "concluido" && dueDate < today;
}

/** Data de hoje (AAAA-MM-DD) no fuso de Brasília. */
export function todayInBrazil(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(now);
}

/**
 * Datas automáticas ao mudar o status de uma atividade:
 * - saiu de "Não iniciado" e o Início está vazio: Início = hoje;
 * - Concluído e a Conclusão está vazia: Conclusão = hoje;
 * - qualquer outro status: Conclusão fica vazia.
 */
export function statusDates(
  status: Status,
  dates: { startDate: string | null; completedOn: string | null },
  today: string,
) {
  return {
    startDate: dates.startDate ?? (status === "nao_iniciado" ? null : today),
    completedOn: status === "concluido" ? (dates.completedOn ?? today) : null,
  };
}
