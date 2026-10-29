"use client";

import { useEffect, useRef, type ComponentProps } from "react";

/**
 * Select que mantém a opção escolhida depois de enviar o formulário (o React
 * limpa o formulário após a ação). Assim dá para cadastrar várias
 * subatividades seguidas sem escolher a principal de novo a cada vez.
 */
export function StickySelect(props: ComponentProps<"select">) {
  const ref = useRef<HTMLSelectElement>(null);
  const chosen = useRef<string | null>(null);

  useEffect(() => {
    const select = ref.current;
    const form = select?.form;
    if (!select || !form) return;
    const keep = () => {
      const value = chosen.current;
      // O reset do formulário acontece depois deste evento; reaplica em seguida.
      if (value !== null) setTimeout(() => (select.value = value));
    };
    form.addEventListener("reset", keep);
    return () => form.removeEventListener("reset", keep);
  }, []);

  return (
    <select
      ref={ref}
      {...props}
      onChange={(e) => {
        chosen.current = e.currentTarget.value;
        props.onChange?.(e);
      }}
    />
  );
}
