import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ClientReport } from "@/lib/data/report";
import { formatDate, priorityLabel, statusLabel, type Status } from "@/lib/labels";
import { isOverdue, percentDone } from "@/lib/progress";

// Cores fixas do PDF (iguais às etiquetas da tela).
const statusPdfColor: Record<Status, string> = {
  nao_iniciado: "#475569",
  iniciado: "#1d4ed8",
  concluido: "#15803d",
  aguardando_cliente: "#b45309",
  bloqueado: "#b91c1c",
};

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#0f172a" },
  header: { borderBottom: "1pt solid #cbd5e1", paddingBottom: 8, marginBottom: 12 },
  company: { fontSize: 9, color: "#64748b" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 2 },
  subtitle: { fontSize: 10, color: "#475569", marginTop: 2 },
  summary: { flexDirection: "row", gap: 16, marginBottom: 12 },
  summaryBox: { border: "1pt solid #e2e8f0", borderRadius: 4, padding: 6, minWidth: 90 },
  summaryValue: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  summaryLabel: { fontSize: 8, color: "#64748b" },
  module: { marginBottom: 12 },
  moduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f1f5f9",
    padding: 5,
  },
  moduleName: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", borderBottom: "0.5pt solid #e2e8f0", paddingVertical: 4, paddingHorizontal: 5 },
  headRow: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 5, color: "#64748b", fontSize: 8 },
  cName: { flex: 1, paddingRight: 6 },
  cStatus: { width: 90 },
  cWho: { width: 100 },
  cDue: { width: 60 },
  comment: { marginTop: 3, paddingLeft: 8, color: "#334155" },
  commentMeta: { fontSize: 7, color: "#64748b" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#94a3b8",
  },
});

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function ClientReportDocument({
  report,
  today,
  generatedAt,
}: {
  report: ClientReport;
  today: string;
  generatedAt: Date;
}) {
  const all = report.modules.flatMap((m) => m.activities);
  const done = all.filter((a) => a.status === "concluido").length;
  const late = all.filter((a) => isOverdue(a.dueDate, a.status, today)).length;
  const waiting = all.filter((a) => a.status === "aguardando_cliente").length;

  return (
    <Document
      title={`${report.clientName} - ${report.projectName}`}
      author={report.companyName}
      language="pt-BR"
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.company}>{report.companyName}</Text>
          <Text style={s.title}>{report.clientName}</Text>
          <Text style={s.subtitle}>
            {report.projectName} · Andamento da implantação
          </Text>
        </View>

        <View style={s.summary}>
          {[
            [`${percentDone(all.map((a) => a.status))}%`, "concluído"],
            [`${done} de ${all.length}`, "atividades concluídas"],
            [String(waiting), "aguardando cliente"],
            [String(late), "com prazo vencido"],
          ].map(([value, label]) => (
            <View key={label} style={s.summaryBox}>
              <Text style={s.summaryValue}>{value}</Text>
              <Text style={s.summaryLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {report.modules.length === 0 && <Text>Nenhum módulo ativado.</Text>}

        {report.modules.map((m) => (
          <View key={m.id} style={s.module}>
            <View style={s.moduleHeader} wrap={false}>
              <Text style={s.moduleName}>{m.name}</Text>
              <Text>
                {percentDone(m.activities.map((a) => a.status))}% concluído
              </Text>
            </View>
            {m.activities.length > 0 && (
              <View style={s.headRow} wrap={false}>
                <Text style={s.cName}>Atividade</Text>
                <Text style={s.cStatus}>Status</Text>
                <Text style={s.cWho}>Responsável</Text>
                <Text style={s.cDue}>Prazo</Text>
              </View>
            )}
            {m.activities.map((a) => (
              <View key={a.id} style={s.row} wrap={false}>
                <View style={s.cName}>
                  <Text style={a.parentId ? { paddingLeft: 10 } : undefined}>
                    {a.parentId ? "- " : ""}
                    {a.name}
                    {a.priority === "alta" || a.priority === "urgente"
                      ? ` (prioridade ${priorityLabel[a.priority].toLowerCase()})`
                      : ""}
                  </Text>
                  {a.comments.map((c, i) => (
                    <View key={i} style={s.comment}>
                      <Text style={s.commentMeta}>
                        {c.authorName ?? "Intotum"} · {dateTime.format(c.createdAt)}
                      </Text>
                      <Text>{c.body}</Text>
                    </View>
                  ))}
                </View>
                <Text style={[s.cStatus, { color: statusPdfColor[a.status] }]}>
                  {statusLabel[a.status]}
                </Text>
                <Text style={s.cWho}>
                  {[a.assigneeName, a.clientContact].filter(Boolean).join(" / ") || "-"}
                </Text>
                <Text
                  style={[
                    s.cDue,
                    isOverdue(a.dueDate, a.status, today)
                      ? { color: "#b91c1c", fontFamily: "Helvetica-Bold" }
                      : {},
                  ]}
                >
                  {formatDate(a.dueDate) || "-"}
                </Text>
              </View>
            ))}
          </View>
        ))}

        <View style={s.footer} fixed>
          <Text>Gerado em {dateTime.format(generatedAt)}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export function renderClientReport(
  report: ClientReport,
  today: string,
  generatedAt: Date,
) {
  return renderToBuffer(
    <ClientReportDocument report={report} today={today} generatedAt={generatedAt} />,
  );
}
