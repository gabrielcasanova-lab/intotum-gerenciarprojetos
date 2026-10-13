"use client";

import { useActionState } from "react";
import * as ui from "@/lib/ui/styles";
import { requestPasswordReset } from "./actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  if (state?.done) {
    return (
      <p role="status" className="text-sm text-slate-700">
        Se o e-mail estiver cadastrado, enviamos um link para criar uma nova
        senha. Ele vale por 2 horas.
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className={ui.label}>
        E-mail
        <input name="email" type="email" autoComplete="email" required className={ui.input} />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button disabled={pending} className={ui.button}>
        {pending ? "Enviando…" : "Enviar link"}
      </button>
    </form>
  );
}
