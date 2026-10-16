/** Botões ↑ ↓ para mudar a posição de um item; cada um é um formulário próprio. */
export function MoveButtons({
  action,
  fields,
  name,
  first,
  last,
}: {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  name: string;
  first: boolean;
  last: boolean;
}) {
  const buttons = [
    { direction: "up", label: "↑", title: `Subir ${name}`, disabled: first },
    { direction: "down", label: "↓", title: `Descer ${name}`, disabled: last },
  ];
  return (
    <span className="inline-flex gap-0.5">
      {buttons.map((b) => (
        <form key={b.direction} action={action}>
          {Object.entries(fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <input type="hidden" name="direction" value={b.direction} />
          <button
            disabled={b.disabled}
            title={b.title}
            aria-label={b.title}
            className="rounded border border-slate-300 px-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-30"
          >
            {b.label}
          </button>
        </form>
      ))}
    </span>
  );
}
