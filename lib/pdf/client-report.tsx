import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ClientReport } from "@/lib/data/report";
import {
  formatDate,
  implementationStatusLabel,
  priorityLabel,
  statusLabel,
  type Status,
} from "@/lib/labels";
import { isOverdue, percentDone } from "@/lib/progress";

// Cores fixas do PDF (mesma família das etiquetas da tela): texto e fundo da etiqueta.
const statusPdfColor: Record<Status, { text: string; bg: string }> = {
  nao_iniciado: { text: "#475569", bg: "#f1f5f9" },
  iniciado: { text: "#1d4ed8", bg: "#dbeafe" },
  concluido: { text: "#15803d", bg: "#dcfce7" },
  aguardando_cliente: { text: "#b45309", bg: "#fef3c7" },
  bloqueado: { text: "#b91c1c", bg: "#fee2e2" },
};

const brand = "#1e3a8a";
const red = "#b91c1c";

const s = StyleSheet.create({
  page: {
    // Margem de cima nas páginas seguintes; a faixa azul da 1ª página sobe por cima dela.
    paddingTop: 30,
    paddingHorizontal: 0,
    paddingBottom: 44,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  body: { paddingHorizontal: 36 },
  header: {
    backgroundColor: brand,
    marginTop: -30,
    paddingHorizontal: 36,
    paddingVertical: 18,
    marginBottom: 14,
  },
  company: { fontSize: 9, color: "#bfdbfe" },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginTop: 2, color: "#ffffff" },
  subtitle: { fontSize: 10, color: "#dbeafe", marginTop: 2 },
  summary: { flexDirection: "row", gap: 10, marginBottom: 10 },
  summaryBox: { flex: 1, borderRadius: 4, padding: 8, borderLeftWidth: 3 },
  summaryValue: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  summaryLabel: { fontSize: 8, color: "#475569", marginTop: 1 },
  barTrack: { height: 6, backgroundColor: "#e2e8f0", borderRadius: 3 },
  barFill: { height: 6, backgroundColor: "#16a34a", borderRadius: 3 },
  overall: { marginBottom: 14 },
  module: { marginBottom: 14 },
  moduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#e0e7ff",
    borderLeft: `3pt solid ${brand}`,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  moduleName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: brand },
  modulePct: { flexDirection: "row", alignItems: "center", gap: 6, color: brand },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottom: "0.5pt solid #e2e8f0",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  rowAlt: { backgroundColor: "#f8fafc" },
  headRow: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 6,
    color: "#64748b",
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
  },
  cName: { flex: 1, paddingRight: 6 },
  cStatus: { width: 84 },
  cWho: { width: 92, paddingRight: 4 },
  cStart: { width: 52 },
  cDone: { width: 56 },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    fontSize: 7.5,
  },
  comment: {
    marginTop: 3,
    padding: 4,
    backgroundColor: "#eff6ff",
    borderLeft: "2pt solid #93c5fd",
    color: "#334155",
  },
  commentMeta: { fontSize: 7, color: "#64748b" },
  videos: { marginTop: 4 },
  videosTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: brand, marginBottom: 4 },
  videoRow: { flexDirection: "row", gap: 6, paddingVertical: 2 },
  videoLink: { color: "#1d4ed8", textDecoration: "underline" },
  footer: {
    position: "absolute",
    bottom: 18,
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

function Bar({ value, width }: { value: number; width: number | string }) {
  return (
    <View style={[s.barTrack, { width }]}>
      {value > 0 && <View style={[s.barFill, { width: `${value}%` }]} />}
    </View>
  );
}

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
  const overall = percentDone(all.map((a) => a.status));

  const boxes = [
    { value: `${overall}%`, label: "concluído", color: brand, bg: "#eef2ff" },
    { value: `${done} de ${all.length}`, label: "atividades concluídas", color: "#15803d", bg: "#f0fdf4" },
    { value: String(waiting), label: "aguardando cliente", color: "#b45309", bg: "#fffbeb" },
    {
      value: String(late),
      label: "com prazo vencido",
      color: late > 0 ? red : "#475569",
      bg: late > 0 ? "#fef2f2" : "#f8fafc",
    },
  ];

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
            {report.projectName} · Implantação:{" "}
            {implementationStatusLabel[report.status].toLowerCase()}
          </Text>
        </View>

        <View style={s.body}>
          <View style={s.summary}>
            {boxes.map((b) => (
              <View
                key={b.label}
                style={[s.summaryBox, { backgroundColor: b.bg, borderLeftColor: b.color }]}
              >
                <Text style={[s.summaryValue, { color: b.color }]}>{b.value}</Text>
                <Text style={s.summaryLabel}>{b.label}</Text>
              </View>
            ))}
          </View>
          <View style={s.overall}>
            <Bar value={overall} width="100%" />
          </View>

          {report.modules.length === 0 && <Text>Nenhum módulo ativado.</Text>}

          {report.modules.map((m) => {
            const pct = percentDone(m.activities.map((a) => a.status));
            return (
              <View key={m.id} style={s.module}>
                <View style={s.moduleHeader} wrap={false}>
                  <Text style={s.moduleName}>{m.name}</Text>
                  <View style={s.modulePct}>
                    <Bar value={pct} width={60} />
                    <Text>{pct}% concluído</Text>
                  </View>
                </View>
                {m.activities.length > 0 && (
                  <View style={s.headRow} wrap={false}>
                    <Text style={s.cName}>Atividade</Text>
                    <Text style={s.cStatus}>Status</Text>
                    <Text style={s.cWho}>Responsável</Text>
                    <Text style={s.cStart}>Início</Text>
                    <Text style={s.cDone}>Conclusão</Text>
                  </View>
                )}
                {m.activities.map((a, i) => {
                  const color = statusPdfColor[a.status];
                  return (
                    <View
                      key={a.id}
                      style={i % 2 === 1 ? [s.row, s.rowAlt] : s.row}
                      wrap={false}
                    >
                      <View style={s.cName}>
                        <Text style={a.parentId ? { paddingLeft: 10 } : undefined}>
                          {a.parentId ? "- " : ""}
                          {a.name}
                          {a.priority === "alta" || a.priority === "urgente"
                            ? ` (prioridade ${priorityLabel[a.priority].toLowerCase()})`
                            : ""}
                        </Text>
                        {a.comments.map((c, j) => (
                          <View key={j} style={s.comment}>
                            <Text style={s.commentMeta}>
                              {c.authorName ?? "Intotum"} · {dateTime.format(c.createdAt)}
                            </Text>
                            <Text>{c.body}</Text>
                          </View>
                        ))}
                      </View>
                      <View style={s.cStatus}>
                        <Text
                          style={[s.pill, { color: color.text, backgroundColor: color.bg }]}
                        >
                          {statusLabel[a.status]}
                        </Text>
                      </View>
                      <Text style={s.cWho}>
                        {[a.assigneeName, a.clientContact].filter(Boolean).join(" / ") ||
                          "-"}
                      </Text>
                      <Text style={s.cStart}>{formatDate(a.startDate) || "-"}</Text>
                      <Text style={s.cDone}>{formatDate(a.completedOn) || "-"}</Text>
                    </View>
                  );
                })}
              </View>
            );
          })}

          {report.videos.length > 0 && (
            <View style={s.videos} wrap={false}>
              <Text style={s.videosTitle}>Treinamentos gravados</Text>
              {report.videos.map((v, i) => (
                <View key={i} style={s.videoRow}>
                  {v.recordedOn && <Text>{formatDate(v.recordedOn)}</Text>}
                  <Link src={v.url} style={s.videoLink}>
                    {v.title}
                  </Link>
                </View>
              ))}
            </View>
          )}
        </View>

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
