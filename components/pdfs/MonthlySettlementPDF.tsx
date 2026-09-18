import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import { registerPdfFonts } from '@/lib/pdf-fonts'

registerPdfFonts()

// ═══════════════════════════════════════════════════
// Palette
// ═══════════════════════════════════════════════════
const C = {
  navy: '#1e3a5f',
  gold: '#b8860b',
  lightGold: '#f5ecd7',
  gray: '#555',
  dark: '#1a1a1a',
  line: '#d4c9a8',
}

const EMERALD = '#059669'
const ROSE = '#dc2626'
const CYAN = '#0891b2'

// ═══════════════════════════════════════════════════
// 🎯 DYNAMIC SIZING
// ═══════════════════════════════════════════════════
function getDynamicSizes(totalRows: number) {
  if (totalRows <= 10) {
    return {
      contentPadding: 42, contentPaddingTop: 38,
      fontSize: 10,
      titleSize: 20, titleFrSize: 11,
      titleMarginTop: 10, titleMarginBottom: 15,
      headerPaddingBottom: 12, headerMarginBottom: 14,
      sectionMarginBottom: 10,
      sectionHeaderPadding: 5,
      rowPadding: 6, rowPaddingH: 10,
      summaryPadding: 12, summaryMarginTop: 12, summaryRowPadding: 4,
      infoBoxPadding: 10, infoBoxMarginTop: 10,
      balanceBoxPadding: 15, balanceBoxMarginTop: 12,
      balanceValueSize: 24, balanceUnitSize: 12,
      footerMarginTop: 20, footerPaddingTop: 12,
      signLabelFrMarginBottom: 35,
      footerNoteMarginTop: 12,
    }
  }
  if (totalRows <= 20) {
    return {
      contentPadding: 32, contentPaddingTop: 28,
      fontSize: 9,
      titleSize: 17, titleFrSize: 10,
      titleMarginTop: 7, titleMarginBottom: 11,
      headerPaddingBottom: 10, headerMarginBottom: 10,
      sectionMarginBottom: 8,
      sectionHeaderPadding: 4,
      rowPadding: 5, rowPaddingH: 8,
      summaryPadding: 10, summaryMarginTop: 10, summaryRowPadding: 3.5,
      infoBoxPadding: 8, infoBoxMarginTop: 8,
      balanceBoxPadding: 12, balanceBoxMarginTop: 10,
      balanceValueSize: 22, balanceUnitSize: 11,
      footerMarginTop: 16, footerPaddingTop: 10,
      signLabelFrMarginBottom: 30,
      footerNoteMarginTop: 10,
    }
  }
  if (totalRows <= 30) {
    return {
      contentPadding: 26, contentPaddingTop: 22,
      fontSize: 8.5,
      titleSize: 15, titleFrSize: 9,
      titleMarginTop: 5, titleMarginBottom: 8,
      headerPaddingBottom: 8, headerMarginBottom: 8,
      sectionMarginBottom: 6,
      sectionHeaderPadding: 3.5,
      rowPadding: 3.5, rowPaddingH: 6,
      summaryPadding: 8, summaryMarginTop: 8, summaryRowPadding: 3,
      infoBoxPadding: 6, infoBoxMarginTop: 6,
      balanceBoxPadding: 10, balanceBoxMarginTop: 8,
      balanceValueSize: 20, balanceUnitSize: 10,
      footerMarginTop: 12, footerPaddingTop: 8,
      signLabelFrMarginBottom: 25,
      footerNoteMarginTop: 8,
    }
  }
  return {
    contentPadding: 20, contentPaddingTop: 18,
    fontSize: 8,
    titleSize: 14, titleFrSize: 8.5,
    titleMarginTop: 4, titleMarginBottom: 6,
    headerPaddingBottom: 6, headerMarginBottom: 6,
    sectionMarginBottom: 5,
    sectionHeaderPadding: 3,
    rowPadding: 2.5, rowPaddingH: 5,
    summaryPadding: 6, summaryMarginTop: 6, summaryRowPadding: 2.5,
    infoBoxPadding: 5, infoBoxMarginTop: 5,
    balanceBoxPadding: 8, balanceBoxMarginTop: 6,
    balanceValueSize: 18, balanceUnitSize: 10,
    footerMarginTop: 10, footerPaddingTop: 6,
    signLabelFrMarginBottom: 22,
    footerNoteMarginTop: 6,
  }
}

type Item = { description: string; date: string; amount: number }

export default function MonthlySettlementPDF({ data }: { data: any }) {
  const totalRows =
    (data.payments?.length || 0) +
    (data.expenses?.length || 0) +
    (data.transfersIn?.length || 0) +
    (data.transfersOut?.length || 0)
  const S = getDynamicSizes(totalRows)

  const styles = StyleSheet.create({
    page: {
      padding: 0,
      fontFamily: 'Cairo',
      fontSize: S.fontSize,
      direction: 'rtl',
    },

    outerFrame: {
      position: 'absolute', top: 18, left: 18, right: 18, bottom: 18,
      borderWidth: 2.5, borderColor: C.navy, borderRadius: 4,
    },
    innerFrame: {
      position: 'absolute', top: 25, left: 25, right: 25, bottom: 25,
      borderWidth: 0.8, borderColor: C.gold, borderRadius: 2,
    },

    content: {
      padding: S.contentPadding,
      paddingTop: S.contentPaddingTop,
    },

    header: {
      alignItems: 'center',
      paddingBottom: S.headerPaddingBottom,
      borderBottomWidth: 2, borderBottomColor: C.navy,
      marginBottom: S.headerMarginBottom,
    },
    kingdomAr: { fontSize: 11, fontWeight: 'bold', color: C.navy, textAlign: 'center' },
    kingdomFr: { fontSize: 8.5, fontWeight: 'bold', color: C.navy, textAlign: 'center', marginTop: 1 },
    schoolAr: { fontSize: 14, fontWeight: 'bold', color: C.gold, textAlign: 'center', marginTop: 6 },
    schoolSub: { fontSize: 9, color: C.gray, textAlign: 'center', marginTop: 2 },

    titleBox: {
      alignItems: 'center',
      marginTop: S.titleMarginTop,
      marginBottom: S.titleMarginBottom,
    },
    titleAr: { fontSize: S.titleSize, fontWeight: 'bold', color: C.navy, textAlign: 'center' },
    titleFr: {
      fontSize: S.titleFrSize, fontWeight: 'bold', color: C.gold,
      textAlign: 'center', letterSpacing: 2, marginTop: 2,
    },
    titleDivider: { width: 160, height: 1.5, backgroundColor: C.gold, marginTop: 6 },

    section: { marginBottom: S.sectionMarginBottom },
    sectionHeader: {
      backgroundColor: C.navy, borderRadius: 3,
      paddingVertical: S.sectionHeaderPadding,
      paddingHorizontal: 10,
      marginBottom: 5,
      flexDirection: 'row-reverse',
      justifyContent: 'space-between', alignItems: 'center',
    },
    sectionTitleAr: { fontSize: 10, fontWeight: 'bold', color: '#ffffff', textAlign: 'right' },
    sectionTitleFr: { fontSize: 8, color: C.lightGold, textAlign: 'left', fontStyle: 'italic' },
    sectionNote: {
      fontSize: 8, color: C.gray, fontStyle: 'italic',
      padding: 5, backgroundColor: '#fafafa', borderRadius: 2,
      marginBottom: 5, textAlign: 'right',
    },

    table: {
      borderWidth: 1, borderColor: C.navy, borderRadius: 3, overflow: 'hidden',
    },
    row: {
      flexDirection: 'row-reverse',
      borderBottomWidth: 0.5, borderBottomColor: '#e5e5e5',
      borderBottomStyle: 'dotted',
      paddingVertical: S.rowPadding,
      paddingHorizontal: S.rowPaddingH,
      alignItems: 'center',
    },
    rowAlt: { backgroundColor: '#fafafa' },
    rowLast: {
      flexDirection: 'row-reverse',
      paddingVertical: S.rowPadding,
      paddingHorizontal: S.rowPaddingH,
      alignItems: 'center',
    },
    cell: { flex: 1, fontSize: 9, color: C.dark, textAlign: 'right' },
    cellAmount: { width: 100, fontSize: 9.5, textAlign: 'left', fontWeight: 'bold' },

    summary: {
      backgroundColor: C.lightGold,
      borderWidth: 1, borderColor: C.gold,
      borderRadius: 4, padding: S.summaryPadding,
      marginTop: S.summaryMarginTop,
    },
    summaryRow: {
      flexDirection: 'row-reverse', justifyContent: 'space-between',
      paddingVertical: S.summaryRowPadding, alignItems: 'center',
    },
    summaryLabelAr: { fontSize: 10, color: C.navy, textAlign: 'right', fontWeight: 'bold' },
    summaryValue: { fontSize: 11, fontWeight: 'bold', textAlign: 'left' },

    infoBox: {
      backgroundColor: '#f0f9ff',
      borderWidth: 1, borderColor: '#7dd3fc',
      borderRadius: 4, padding: S.infoBoxPadding,
      marginTop: S.infoBoxMarginTop,
    },
    infoTitleAr: {
      fontSize: 9, color: '#0369a1', marginBottom: 4,
      textAlign: 'right', fontWeight: 'bold',
    },
    infoTitleFr: {
      fontSize: 7.5, color: '#0369a1', marginBottom: 6,
      textAlign: 'right', fontStyle: 'italic',
    },
    infoRow: {
      flexDirection: 'row-reverse', justifyContent: 'space-between',
      paddingVertical: 2,
    },
    infoLabel: { fontSize: 9, color: '#0369a1', textAlign: 'right' },
    infoValue: { fontSize: 9, fontWeight: 'bold', color: CYAN, textAlign: 'left' },

    balanceBox: {
      backgroundColor: '#f0fdf4',
      borderWidth: 2, borderColor: '#86efac',
      borderRadius: 6, padding: S.balanceBoxPadding,
      alignItems: 'center', marginTop: S.balanceBoxMarginTop,
    },
    balanceLabelAr: {
      fontSize: 11, color: '#166534', marginBottom: 2, fontWeight: 'bold',
    },
    balanceLabelFr: { fontSize: 8, color: '#166534', marginBottom: 8, fontStyle: 'italic' },
    balanceValue: {
      fontSize: S.balanceValueSize, fontWeight: 'bold', color: '#166534',
    },
    balanceUnit: { fontSize: S.balanceUnitSize, color: '#166534', fontWeight: 'bold' },

    footer: {
      marginTop: S.footerMarginTop,
      borderTopWidth: 1, borderTopColor: C.gold,
      paddingTop: S.footerPaddingTop,
      flexDirection: 'row-reverse', justifyContent: 'space-between',
    },
    signBox: { width: 180, alignItems: 'center' },
    signLabelAr: { fontSize: 9, color: C.navy, fontWeight: 'bold', textAlign: 'center' },
    signLabelFr: {
      fontSize: 7, color: C.gray, textAlign: 'center',
      marginBottom: S.signLabelFrMarginBottom, fontStyle: 'italic',
    },
    signLine: {
      borderTopWidth: 1, borderTopColor: C.navy,
      width: 150, marginTop: 10, paddingTop: 4,
    },
    footerNote: {
      fontSize: 7.5, color: C.gray, textAlign: 'center',
      marginTop: S.footerNoteMarginTop, fontStyle: 'italic',
    },
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.outerFrame} />
        <View style={styles.innerFrame} />

        <View style={styles.content}>
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.kingdomAr}>المملكة المغربية</Text>
            <Text style={styles.kingdomFr}>Royaume du Maroc</Text>
            <Text style={styles.schoolAr}>{data.schoolName}</Text>
            <Text style={styles.schoolSub}>
              {data.caisseName} — {data.period}
            </Text>
          </View>

          {/* TITLE */}
          <View style={styles.titleBox}>
            <Text style={styles.titleAr}>تقرير تسوية الشهر</Text>
            <Text style={styles.titleFr}>RAPPORT DE RÉGULARISATION MENSUELLE</Text>
            <View style={styles.titleDivider} />
          </View>

          {/* PAYMENTS */}
          {data.payments.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitleAr}>المداخيل الحقيقية</Text>
                <Text style={styles.sectionTitleFr}>Encaissements</Text>
              </View>
              <View style={styles.table}>
                {data.payments.map((p: Item, i: number) => (
                  <View
                    key={i}
                    style={[
                      i === data.payments.length - 1 ? styles.rowLast : styles.row,
                      i % 2 === 1 ? styles.rowAlt : {},
                    ]}
                  >
                    <Text style={styles.cell}>
                      {p.description} ({p.date})
                    </Text>
                    <Text style={[styles.cellAmount, { color: EMERALD }]}>
                      + {p.amount.toFixed(2)} DH
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* EXPENSES */}
          {data.expenses.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitleAr}>المصاريف الحقيقية</Text>
                <Text style={styles.sectionTitleFr}>Dépenses</Text>
              </View>
              <View style={styles.table}>
                {data.expenses.map((e: Item, i: number) => (
                  <View
                    key={i}
                    style={[
                      i === data.expenses.length - 1 ? styles.rowLast : styles.row,
                      i % 2 === 1 ? styles.rowAlt : {},
                    ]}
                  >
                    <Text style={styles.cell}>
                      {e.description} ({e.date})
                    </Text>
                    <Text style={[styles.cellAmount, { color: ROSE }]}>
                      - {e.amount.toFixed(2)} DH
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TRANSFERS */}
          {(data.transfersIn.length > 0 || data.transfersOut.length > 0) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitleAr}>حركات داخلية</Text>
                <Text style={styles.sectionTitleFr}>Transferts internes</Text>
              </View>
              <Text style={styles.sectionNote}>
                ملاحظة: هذه الحركات لا تُحتسب في المداخيل/المصاريف — مجرد نقل بين الصناديق
              </Text>
              <View style={styles.table}>
                {data.transfersIn.map((t: Item, i: number) => (
                  <View key={`ti-${i}`} style={styles.row}>
                    <Text style={styles.cell}>
                      ← وارد: {t.description} ({t.date})
                    </Text>
                    <Text style={[styles.cellAmount, { color: CYAN }]}>
                      + {t.amount.toFixed(2)} DH
                    </Text>
                  </View>
                ))}
                {data.transfersOut.map((t: Item, i: number) => (
                  <View
                    key={`to-${i}`}
                    style={
                      i === data.transfersOut.length - 1
                        ? styles.rowLast
                        : styles.row
                    }
                  >
                    <Text style={styles.cell}>
                      → صادر: {t.description} ({t.date})
                    </Text>
                    <Text style={[styles.cellAmount, { color: CYAN }]}>
                      - {t.amount.toFixed(2)} DH
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* SUMMARY */}
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelAr}>الرصيد الابتدائي</Text>
              <Text style={[styles.summaryValue, { color: C.navy }]}>
                {data.initialBalance.toFixed(2)} DH
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelAr}>إجمالي المداخيل الحقيقية</Text>
              <Text style={[styles.summaryValue, { color: EMERALD }]}>
                + {data.totalIn.toFixed(2)} DH
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelAr}>إجمالي المصاريف الحقيقية</Text>
              <Text style={[styles.summaryValue, { color: ROSE }]}>
                - {data.totalOut.toFixed(2)} DH
              </Text>
            </View>
          </View>

          {/* INFO TRANSFERS */}
          {(data.totalTransfersIn > 0 || data.totalTransfersOut > 0) && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitleAr}>
                معلومات إضافية (لا تدخل في الحساب)
              </Text>
              <Text style={styles.infoTitleFr}>
                Informations complémentaires (non comptées)
              </Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>التحويلات الواردة</Text>
                <Text style={styles.infoValue}>
                  + {data.totalTransfersIn?.toFixed(2) || '0.00'} DH
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>التحويلات الصادرة</Text>
                <Text style={styles.infoValue}>
                  - {data.totalTransfersOut?.toFixed(2) || '0.00'} DH
                </Text>
              </View>
            </View>
          )}

          {/* BALANCE */}
          <View style={styles.balanceBox}>
            <Text style={styles.balanceLabelAr}>الرصيد النهائي</Text>
            <Text style={styles.balanceLabelFr}>Solde final</Text>
            <Text style={styles.balanceValue}>
              {data.balance.toFixed(2)}
              <Text style={styles.balanceUnit}> DH</Text>
            </Text>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <View style={styles.signBox}>
              <Text style={styles.signLabelAr}>توقيع المدير(ة)</Text>
              <Text style={styles.signLabelFr}>Signature du Directeur</Text>
              <View style={styles.signLine} />
            </View>
            <View style={styles.signBox}>
              <Text style={styles.signLabelAr}>توقيع السكرتيرة</Text>
              <Text style={styles.signLabelFr}>Signature de la Secrétaire</Text>
              <View style={styles.signLine} />
            </View>
          </View>

          <Text style={styles.footerNote}>
            تم إنشاء هذا التقرير تلقائياً — GestionEco · Rapport généré automatiquement
          </Text>
        </View>
      </Page>
    </Document>
  )
}