"use client";

import { useActionState } from "react";
import * as ui from "@/lib/ui/styles";
import { setPasswordFromLink } from "./actions";

export function PasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(setPasswordFromLink, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <label className={ui.label}>
        Nova senha
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={ui.input}
        />
      </label>
      <label className={ui.label}>
        Repita a senha
        <input
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          className={ui.input}
        />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button disabled={pending} className={ui.button}>
        {pending ? "Salvando…" : "Salvar senha e entrar"}
      </button>
    </form>
  );
}
