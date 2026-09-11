import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import path from 'path'

Font.register({
  family: 'Cairo',
  fonts: [
    { src: path.join(process.cwd(), 'public', 'fonts', 'Cairo-Regular.ttf') },
    { src: path.join(process.cwd(), 'public', 'fonts', 'Cairo-Bold.ttf'), fontWeight: 'bold' },
  ],
})

Font.registerHyphenationCallback((word) => [word])

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Cairo', fontSize: 10 },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#4F46E5',
    paddingBottom: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#64748B' },
  schoolName: { fontSize: 14, fontWeight: 'bold', color: '#4F46E5', marginTop: 6 },
  section: { marginBottom: 15 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E293B',
    backgroundColor: '#F1F5F9',
    padding: 8,
    marginBottom: 6,
  },
  sectionNote: { fontSize: 9, color: '#64748B', marginBottom: 6, fontStyle: 'italic' },
  table: { borderWidth: 1, borderColor: '#E2E8F0' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', padding: 6 },
  rowLast: { flexDirection: 'row', padding: 6 },
  cell: { flex: 1, fontSize: 9 },
  cellAmount: { width: 90, fontSize: 9, textAlign: 'right', fontWeight: 'bold' },
  summary: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 8,
    padding: 12,
    marginTop: 15,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 11, color: '#1E293B' },
  summaryValue: { fontSize: 11, fontWeight: 'bold' },
  infoBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#7DD3FC',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  balanceBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 12,
  },
  balanceValue: { fontSize: 22, fontWeight: 'bold', color: '#166534' },
  footer: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signBox: { width: 150 },
  signLine: { borderTopWidth: 1, borderTopColor: '#94A3B8', marginTop: 40, paddingTop: 4 },
  signText: { fontSize: 9, color: '#64748B', textAlign: 'center' },
  footerNote: { fontSize: 8, color: '#94A3B8', textAlign: 'center', marginTop: 15 },
})

type Item = { description: string; date: string; amount: number }

export default function MonthlySettlementPDF({ data }: { data: any }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>تقرير تسوية الشهر</Text>
          <Text style={styles.subtitle}>Rapport de régularisation mensuelle</Text>
          <Text style={styles.schoolName}>{data.schoolName}</Text>
          <Text style={styles.subtitle}>{data.caisseName} — {data.period}</Text>
        </View>

        {/* 1. Paiements (encaissements réels) */}
        {data.payments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📥 المداخيل الحقيقية — Encaissements</Text>
            <View style={styles.table}>
              {data.payments.map((p: Item, i: number) => (
                <View key={i} style={i === data.payments.length - 1 ? styles.rowLast : styles.row}>
                  <Text style={styles.cell}>{p.description} ({p.date})</Text>
                  <Text style={[styles.cellAmount, { color: '#166534' }]}>+ {p.amount.toFixed(2)} DH</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 2. Dépenses (dépenses réelles) */}
        {data.expenses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📤 المصاريف الحقيقية — Dépenses</Text>
            <View style={styles.table}>
              {data.expenses.map((e: Item, i: number) => (
                <View key={i} style={i === data.expenses.length - 1 ? styles.rowLast : styles.row}>
                  <Text style={styles.cell}>{e.description} ({e.date})</Text>
                  <Text style={[styles.cellAmount, { color: '#991B1B' }]}>- {e.amount.toFixed(2)} DH</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 3. Transferts internes (séparés) */}
        {(data.transfersIn.length > 0 || data.transfersOut.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔄 حركات داخلية — Transferts internes</Text>
            <Text style={styles.sectionNote}>
              ملاحظة: هذه الحركات لا تُحتسب في المداخيل/المصاريف — مجرد نقل بين الصناديق
            </Text>
            <View style={styles.table}>
              {data.transfersIn.map((t: Item, i: number) => (
                <View key={`ti-${i}`} style={styles.row}>
                  <Text style={styles.cell}>⬅️ وارد: {t.description} ({t.date})</Text>
                  <Text style={[styles.cellAmount, { color: '#0891B2' }]}>+ {t.amount.toFixed(2)} DH</Text>
                </View>
              ))}
              {data.transfersOut.map((t: Item, i: number) => (
                <View
                  key={`to-${i}`}
                  style={i === data.transfersOut.length - 1 ? styles.rowLast : styles.row}
                >
                  <Text style={styles.cell}>➡️ صادر: {t.description} ({t.date})</Text>
                  <Text style={[styles.cellAmount, { color: '#0891B2' }]}>- {t.amount.toFixed(2)} DH</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>الرصيد الابتدائي</Text>
            <Text style={[styles.summaryValue, { color: '#1E293B' }]}>
              {data.initialBalance.toFixed(2)} DH
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>إجمالي المداخيل الحقيقية</Text>
            <Text style={[styles.summaryValue, { color: '#166534' }]}>
              + {data.totalIn.toFixed(2)} DH
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>إجمالي المصاريف الحقيقية</Text>
            <Text style={[styles.summaryValue, { color: '#991B1B' }]}>
              - {data.totalOut.toFixed(2)} DH
            </Text>
          </View>
        </View>

        {/* Info transferts internes */}
        {(data.totalTransfersIn > 0 || data.totalTransfersOut > 0) && (
          <View style={styles.infoBox}>
            <Text style={{ fontSize: 10, color: '#0369A1', marginBottom: 4 }}>
              ℹ️ معلومات إضافية (لا تدخل في الحساب)
            </Text>
            <View style={styles.summaryRow}>
              <Text style={{ fontSize: 10, color: '#0369A1' }}>التحويلات الواردة</Text>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#0891B2' }}>
                + {data.totalTransfersIn?.toFixed(2) || '0.00'} DH
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={{ fontSize: 10, color: '#0369A1' }}>التحويلات الصادرة</Text>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#0891B2' }}>
                - {data.totalTransfersOut?.toFixed(2) || '0.00'} DH
              </Text>
            </View>
          </View>
        )}

        <View style={styles.balanceBox}>
          <Text style={{ fontSize: 11, color: '#166534', marginBottom: 4 }}>
            الرصيد النهائي — Solde final
          </Text>
          <Text style={styles.balanceValue}>{data.balance.toFixed(2)} DH</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.signBox}>
            <View style={styles.signLine}>
              <Text style={styles.signText}>توقيع المدير</Text>
            </View>
          </View>
          <View style={styles.signBox}>
            <View style={styles.signLine}>
              <Text style={styles.signText}>توقيع السكرتيرة</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footerNote}>
          تم إنشاء هذا التقرير تلقائياً — GestionEco
        </Text>
      </Page>
    </Document>
  )
}