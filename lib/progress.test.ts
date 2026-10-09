import { describe, expect, it } from "vitest";
import { isOverdue, percentDone, todayInBrazil } from "./progress";

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
