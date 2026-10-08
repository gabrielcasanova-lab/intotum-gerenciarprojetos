import bcrypt from "bcryptjs";

// bcryptjs é JavaScript puro: não precisa compilar nada no servidor do cPanel.
const ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

/** Estado da conta depois de uma tentativa de login. */
export function nextLockState(
  failedAttempts: number,
  success: boolean,
  now: Date,
): { failedLoginAttempts: number; lockedUntil: Date | null } {
  if (success) return { failedLoginAttempts: 0, lockedUntil: null };
  const attempts = failedAttempts + 1;
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    return {
      failedLoginAttempts: 0,
      lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000),
    };
  }
  return { failedLoginAttempts: attempts, lockedUntil: null };
}
