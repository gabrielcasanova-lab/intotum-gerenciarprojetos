import { implementationStatusColor, type ImplementationStatus } from "@/lib/labels";
import { dictionary, type Language } from "@/lib/i18n";

/** Etiqueta da situação da implantação (Em andamento, Finalizado, Cancelado). */
export function ImplementationBadge({
  status,
  language = "pt",
}: {
  status: ImplementationStatus;
  language?: Language;
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs ${implementationStatusColor[status]}`}
    >
      {dictionary(language).implementationStatus[status]}
    </span>
  );
}
