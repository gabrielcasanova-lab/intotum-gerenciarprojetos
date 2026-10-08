import { describe, expect, it } from "vitest";
import {
  hashPassword,
  LOCK_MINUTES,
  MAX_FAILED_ATTEMPTS,
  nextLockState,
  verifyPassword,
} from "./password";

describe("senha", () => {
  it("confere a senha certa e recusa a errada", async () => {
    const hash = await hashPassword("Senha#123");
    expect(hash).not.toContain("Senha#123");
    expect(await verifyPassword("Senha#123", hash)).toBe(true);
    expect(await verifyPassword("senha#123", hash)).toBe(false);
  });
});

describe("bloqueio por tentativas", () => {
  const now = new Date("2026-10-08T12:00:00Z");

  it("zera o contador no login certo", () => {
    expect(nextLockState(3, true, now)).toEqual({
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  });

  it("conta erros até o limite", () => {
    expect(nextLockState(0, false, now).failedLoginAttempts).toBe(1);
    expect(nextLockState(MAX_FAILED_ATTEMPTS - 2, false, now).lockedUntil).toBeNull();
  });

  it("bloqueia ao atingir o limite", () => {
    const s = nextLockState(MAX_FAILED_ATTEMPTS - 1, false, now);
    expect(s.lockedUntil?.getTime()).toBe(now.getTime() + LOCK_MINUTES * 60_000);
  });
});
