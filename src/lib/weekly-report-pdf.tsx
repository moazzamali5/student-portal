import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, paddingBottom: 48, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#475569", marginBottom: 20 },
  studentBlock: { marginBottom: 16 },
  studentHeader: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 2, color: "#1e293b" },
  studentMeta: { fontSize: 9, color: "#64748b", marginBottom: 6 },
  table: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e2e8f0" },
  tableRowLast: { flexDirection: "row" },
  tableHeaderCell: {
    padding: 6,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#f1f5f9",
    fontSize: 9,
    color: "#475569",
  },
  tableCell: { padding: 6, fontSize: 9 },
  colDate: { width: "38%" },
  colTime: { width: "37%" },
  colDuration: { width: "25%", textAlign: "right" },
  subtotalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
  subtotalText: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  grandTotalBox: { marginTop: 12, padding: 12, backgroundColor: "#eef2ff", borderRadius: 6 },
  grandTotalText: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#4338ca" },
  emptyText: { fontSize: 11, color: "#64748b", marginTop: 20 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
  },
});

export type StudentReportRow = {
  name: string;
  rollNumber: string | null;
  className: string | null;
  classes: { dateLabel: string; timeLabel: string; hours: number }[];
  totalHours: number;
};

export function WeeklyReportDocument({
  rangeLabel,
  students,
  grandTotalHours,
  unicodeFontFamily,
}: {
  rangeLabel: string;
  students: StudentReportRow[];
  grandTotalHours: number;
  // Set only when a student's name/roll/class needs characters outside
  // Helvetica's Latin-1 support — see src/lib/pdf-font.ts.
  unicodeFontFamily?: string | null;
}) {
  const nameStyle = unicodeFontFamily
    ? [styles.studentHeader, { fontFamily: unicodeFontFamily, fontWeight: 700 as const }]
    : [styles.studentHeader];
  const metaStyle = unicodeFontFamily
    ? [styles.studentMeta, { fontFamily: unicodeFontFamily, fontWeight: 400 as const }]
    : [styles.studentMeta];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Weekly Class Report</Text>
        <Text style={styles.subtitle}>{rangeLabel} — English Class by Ali</Text>

        {students.length === 0 && <Text style={styles.emptyText}>No classes scheduled this week.</Text>}

        {students.map((s) => (
          <View key={s.name} style={styles.studentBlock} wrap={false}>
            <Text style={nameStyle}>{s.name}</Text>
            {(s.rollNumber || s.className) && (
              <Text style={metaStyle}>{[s.rollNumber, s.className].filter(Boolean).join(" · ")}</Text>
            )}
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={[styles.tableHeaderCell, styles.colDate]}>Date</Text>
                <Text style={[styles.tableHeaderCell, styles.colTime]}>Time</Text>
                <Text style={[styles.tableHeaderCell, styles.colDuration]}>Duration</Text>
              </View>
              {s.classes.map((c, i) => (
                <View key={i} style={i === s.classes.length - 1 ? styles.tableRowLast : styles.tableRow}>
                  <Text style={[styles.tableCell, styles.colDate]}>{c.dateLabel}</Text>
                  <Text style={[styles.tableCell, styles.colTime]}>{c.timeLabel}</Text>
                  <Text style={[styles.tableCell, styles.colDuration]}>{c.hours.toFixed(2)}h</Text>
                </View>
              ))}
            </View>
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalText}>Subtotal: {s.totalHours.toFixed(2)} hours</Text>
            </View>
          </View>
        ))}

        {students.length > 0 && (
          <View style={styles.grandTotalBox}>
            <Text style={styles.grandTotalText}>
              Grand total: {grandTotalHours.toFixed(2)} hours across {students.length} student
              {students.length === 1 ? "" : "s"}
            </Text>
          </View>
        )}

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
