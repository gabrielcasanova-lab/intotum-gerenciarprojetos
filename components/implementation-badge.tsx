import {
  implementationStatusColor,
  implementationStatusLabel,
  type ImplementationStatus,
} from "@/lib/labels";

/** Etiqueta da situação da implantação (Em andamento, Finalizado, Cancelado). */
export function ImplementationBadge({ status }: { status: ImplementationStatus }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs ${implementationStatusColor[status]}`}
    >
      {implementationStatusLabel[status]}
    </span>
  );
}
