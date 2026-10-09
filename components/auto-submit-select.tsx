"use client";

import type { ComponentProps } from "react";

/** Select que envia o formulário assim que o valor muda (ex.: status). */
export function AutoSubmitSelect(props: ComponentProps<"select">) {
  return (
    <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />
  );
}
