import { describe, expect, it } from "vitest";
import { isOverdue, percentDone, statusDates, todayInBrazil } from "./progress";

describe("percentDone", () => {
  it("lista vazia é 0%", () => {
    expect(percentDone([])).toBe(0);
  });

  it("conta só as concluídas", () => {
    expect(
      percentDone(["concluido", "iniciado", "aguardando_cliente", "concluido"]),
    ).toBe(50);
    expect(percentDone(["concluido", "nao_iniciado", "bloqueado"])).toBe(33);
  });
});

describe("isOverdue", () => {
  it("vencida e não concluída", () => {
    expect(isOverdue("2026-10-01", "iniciado", "2026-10-08")).toBe(true);
  });

  it("concluída nunca está atrasada", () => {
    expect(isOverdue("2026-10-01", "concluido", "2026-10-08")).toBe(false);
  });

  it("vence hoje ainda não está atrasada", () => {
    expect(isOverdue("2026-10-08", "iniciado", "2026-10-08")).toBe(false);
  });

  it("sem vencimento não está atrasada", () => {
    expect(isOverdue(null, "bloqueado", "2026-10-08")).toBe(false);
  });
});

describe("todayInBrazil", () => {
  it("usa o fuso de Brasília perto da meia-noite UTC", () => {
    // 02:00 UTC do dia 9 ainda é dia 8 em Brasília (UTC-3).
    expect(todayInBrazil(new Date("2026-10-09T02:00:00Z"))).toBe("2026-10-08");
  });
});

describe("statusDates", () => {
  const today = "2026-10-20";
  const empty = { startDate: null, completedOn: null };
  it("Iniciado sem início: põe hoje", () => {
    expect(statusDates("iniciado", empty, today)).toEqual({
      startDate: today,
      completedOn: null,
    });
  });
  it("mantém o início já informado", () => {
    expect(
      statusDates("iniciado", { startDate: "2026-10-01", completedOn: null }, today),
    ).toEqual({ startDate: "2026-10-01", completedOn: null });
  });
  it("Concluído: põe início e conclusão vazios como hoje", () => {
    expect(statusDates("concluido", empty, today)).toEqual({
      startDate: today,
      completedOn: today,
    });
    expect(
      statusDates("concluido", { startDate: "2026-10-01", completedOn: "2026-10-15" }, today),
    ).toEqual({ startDate: "2026-10-01", completedOn: "2026-10-15" });
  });
  it("Não iniciado não inventa início; sair de Concluído limpa a conclusão", () => {
    expect(statusDates("nao_iniciado", empty, today)).toEqual(empty);
    expect(
      statusDates("bloqueado", { startDate: "2026-10-01", completedOn: "2026-10-15" }, today),
    ).toEqual({ startDate: "2026-10-01", completedOn: null });
  });
});
