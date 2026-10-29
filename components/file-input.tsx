"use client";

import type { ComponentProps } from "react";

/**
 * Campo de arquivo que avisa no próprio navegador quando o arquivo passa do
 * limite, antes de enviar (o servidor também confere).
 */
export function FileInput({
  maxBytes,
  ...props
}: ComponentProps<"input"> & { maxBytes: number }) {
  return (
    <input
      type="file"
      {...props}
      onChange={(e) => {
        const input = e.currentTarget;
        const file = input.files?.[0];
        const mb = Math.round(maxBytes / 1024 / 1024);
        input.setCustomValidity(
          file && file.size > maxBytes ? `Arquivo maior que ${mb} MB.` : "",
        );
        input.reportValidity();
      }}
    />
  );
}
