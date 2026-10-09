"use client";

import type { ComponentProps } from "react";

/** Botão de envio que pede confirmação antes (para exclusões). */
export function ConfirmButton({
  message,
  ...props
}: ComponentProps<"button"> & { message: string }) {
  return (
    <button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    />
  );
}
