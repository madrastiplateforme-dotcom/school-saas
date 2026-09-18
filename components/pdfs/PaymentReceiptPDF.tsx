import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
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

type ReceiptData = {
  receiptNumber: string
  studentName: string
  amount: number
  paymentDate: string
  method: string
  description: string
  schoolName: string
  schoolLogo: string | null
  schoolAddress?: string | null
  schoolPhone?: string | null
  cashierName?: string
  reference?: string | null
}

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 11,
    fontFamily: 'Cairo',
    backgroundColor: '#ffffff',
    direction: 'rtl',
  },

  outerFrame: {
    position: 'absolute',
    top: 18,
    left: 18,
    right: 18,
    bottom: 18,
    borderWidth: 2.5,
    borderColor: C.navy,
    borderRadius: 4,
  },
  innerFrame: {
    position: 'absolute',
    top: 25,
    left: 25,
    right: 25,
    bottom: 25,
    borderWidth: 0.8,
    borderColor: C.gold,
    borderRadius: 2,
  },

  content: {
    padding: 42,
    paddingTop: 38,
  },

  // ─── Header ───
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.navy,
    marginBottom: 12,
  },
  logoBox: {
    width: 55,
    height: 55,
    borderRadius: 6,
    backgroundColor: C.lightGold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.gold,
  },
  logo: { width: 55, height: 55, borderRadius: 6 },
  logoPlaceholder: {
    fontSize: 22,
    color: C.navy,
    fontWeight: 'bold',
  },
  headerCenter: {
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  kingdomAr: {
    fontSize: 11,
    fontWeight: 'bold',
    color: C.navy,
    textAlign: 'center',
  },
  kingdomFr: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: C.navy,
    textAlign: 'center',
    marginTop: 1,
  },
  schoolAr: {
    fontSize: 14,
    fontWeight: 'bold',
    color: C.gold,
    textAlign: 'center',
    marginTop: 6,
  },
  schoolSub: {
    fontSize: 8.5,
    color: C.gray,
    textAlign: 'center',
    marginTop: 2,
  },
  receiptBadge: {
    backgroundColor: C.navy,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 100,
    alignItems: 'center',
  },
  receiptBadgeText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // ─── Title ───
  titleBox: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  titleAr: {
    fontSize: 22,
    fontWeight: 'bold',
    color: C.navy,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  titleFr: {
    fontSize: 12,
    fontWeight: 'bold',
    color: C.gold,
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: 3,
  },
  titleDivider: {
    width: 180,
    height: 2,
    backgroundColor: C.gold,
    marginTop: 8,
  },

  // ─── Info Grid ───
  infoGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    marginBottom: 15,
    backgroundColor: '#fafafa',
    borderRadius: 3,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: C.gold,
  },
  infoItem: {
    width: '50%',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  infoLabelAr: {
    fontSize: 8,
    color: C.gray,
    marginBottom: 1,
    textAlign: 'right',
  },
  infoLabelFr: {
    fontSize: 7,
    color: C.gray,
    marginBottom: 3,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  infoValue: {
    fontSize: 11,
    color: C.dark,
    fontWeight: 'bold',
    textAlign: 'right',
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    borderBottomStyle: 'dashed',
    marginVertical: 12,
  },

  // ─── Amount Box ───
  amountBox: {
    backgroundColor: C.lightGold,
    borderWidth: 2,
    borderColor: C.gold,
    borderRadius: 6,
    padding: 20,
    alignItems: 'center',
    marginVertical: 15,
  },
  amountLabelAr: {
    fontSize: 10,
    color: C.navy,
    marginBottom: 2,
    fontWeight: 'bold',
  },
  amountLabelFr: {
    fontSize: 8,
    color: C.gray,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  amountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: C.navy,
  },
  amountUnit: {
    fontSize: 14,
    color: C.gold,
    fontWeight: 'bold',
  },

  // ─── Table ───
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: C.navy,
    borderRadius: 3,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: C.navy,
    flexDirection: 'row-reverse',
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  tableRow: {
    flexDirection: 'row-reverse',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#e5e5e5',
    borderTopStyle: 'dotted',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  tableColRight: {
    flex: 1,
    fontSize: 10,
    color: C.dark,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  tableColLeft: {
    width: 130,
    fontSize: 10,
    color: C.dark,
    textAlign: 'left',
    fontWeight: 'bold',
  },
  tableHeaderText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  // ─── Cashier ───
  cashierBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 4,
    padding: 12,
    marginTop: 15,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cashierLabelAr: {
    fontSize: 8.5,
    color: '#92400e',
    marginBottom: 2,
    textAlign: 'right',
  },
  cashierLabelFr: {
    fontSize: 7,
    color: '#92400e',
    textAlign: 'right',
    fontStyle: 'italic',
  },
  cashierValue: {
    fontSize: 12,
    color: '#78350f',
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 2,
  },
  cashierStamp: {
    backgroundColor: EMERALD,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  cashierStampText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },

  // ─── Stamp (PAGE) ───
  stamp: {
    position: 'absolute',
    top: 130,
    right: 55,
    borderWidth: 2.5,
    borderColor: EMERALD,
    borderRadius: 60,
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'rotate(-18deg)',
    opacity: 0.85,
  },
  stampAr: {
    fontSize: 11,
    color: EMERALD,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  stampFr: {
    fontSize: 9,
    color: EMERALD,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 1,
  },

  // ─── Footer ───
  footer: {
    position: 'absolute',
    bottom: 42,
    left: 42,
    right: 42,
    borderTopWidth: 1,
    borderTopColor: C.gold,
    paddingTop: 15,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: 160,
    alignItems: 'center',
  },
  signatureLabelAr: {
    fontSize: 9,
    color: C.navy,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  signatureLabelFr: {
    fontSize: 7,
    color: C.gray,
    textAlign: 'center',
    marginBottom: 40,
    fontStyle: 'italic',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: C.navy,
    width: 150,
    marginTop: 15,
    paddingTop: 4,
  },
  signatureText: {
    fontSize: 8,
    color: C.gray,
    textAlign: 'center',
  },
  footerNote: {
    fontSize: 7.5,
    color: C.gray,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
})

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return dateStr
  }
}

const methodLabels: Record<string, string> = {
  cash: 'نقداً / Espèces',
  bank_transfer: 'تحويل بنكي / Virement',
  transfer: 'تحويل بنكي / Virement',
  check: 'شيك / Chèque',
  cheque: 'شيك / Chèque',
  card: 'بطاقة / Carte',
  other: 'أخرى / Autre',
}

export default function PaymentReceiptPDF({ data }: { data: ReceiptData }) {
  const methodLabel = methodLabels[data.method] || data.method

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cadres décoratifs */}
        <View style={styles.outerFrame} />
        <View style={styles.innerFrame} />

        <View style={styles.content}>
          {/* ═══════ HEADER ═══════ */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              {data.schoolLogo ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image src={data.schoolLogo} style={styles.logo} />
              ) : (
                <Text style={styles.logoPlaceholder}>
                  {data.schoolName?.charAt(0) || 'م'}
                </Text>
              )}
            </View>

            <View style={styles.headerCenter}>
              <Text style={styles.kingdomAr}>المملكة المغربية</Text>
              <Text style={styles.kingdomFr}>Royaume du Maroc</Text>
              <Text style={styles.schoolAr}>{data.schoolName}</Text>
              {data.schoolAddress && (
                <Text style={styles.schoolSub}>{data.schoolAddress}</Text>
              )}
              {data.schoolPhone && (
                <Text style={styles.schoolSub}>📞 {data.schoolPhone}</Text>
              )}
            </View>

            <View style={styles.receiptBadge}>
              <Text style={styles.receiptBadgeText}>
                N° {data.receiptNumber}
              </Text>
            </View>
          </View>

          {/* ═══════ TITLE ═══════ */}
          <View style={styles.titleBox}>
            <Text style={styles.titleAr}>وصل الدفع</Text>
            <Text style={styles.titleFr}>REÇU DE PAIEMENT</Text>
            <View style={styles.titleDivider} />
          </View>

          {/* ═══════ INFO GRID ═══════ */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabelAr}>التلميذ(ة)</Text>
              <Text style={styles.infoLabelFr}>Élève</Text>
              <Text style={styles.infoValue}>
                {data.studentName || '—'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabelAr}>رقم الوصل</Text>
              <Text style={styles.infoLabelFr}>N° Reçu</Text>
              <Text style={styles.infoValue}>{data.receiptNumber}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabelAr}>تاريخ الدفع</Text>
              <Text style={styles.infoLabelFr}>Date de paiement</Text>
              <Text style={styles.infoValue}>
                {formatDate(data.paymentDate)}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabelAr}>طريقة الدفع</Text>
              <Text style={styles.infoLabelFr}>Mode de paiement</Text>
              <Text style={styles.infoValue}>{methodLabel}</Text>
            </View>
            {data.reference && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabelAr}>المرجع</Text>
                <Text style={styles.infoLabelFr}>Référence</Text>
                <Text style={styles.infoValue}>{data.reference}</Text>
              </View>
            )}
          </View>

          {/* ═══════ AMOUNT ═══════ */}
          <View style={styles.amountBox}>
            <Text style={styles.amountLabelAr}>المبلغ المدفوع</Text>
            <Text style={styles.amountLabelFr}>Montant payé</Text>
            <Text style={styles.amountValue}>
              {data.amount.toFixed(2)}
              <Text style={styles.amountUnit}> DH</Text>
            </Text>
          </View>

          {/* ═══════ DETAILS TABLE ═══════ */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableColRight, styles.tableHeaderText]}>
                البيان
              </Text>
              <Text style={[styles.tableColLeft, styles.tableHeaderText]}>
                المبلغ / Montant
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableColRight}>
                {data.description || 'الرسوم الدراسية / Frais de scolarité'}
              </Text>
              <Text style={styles.tableColLeft}>
                {data.amount.toFixed(2)} DH
              </Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowAlt]}>
              <Text style={[styles.tableColRight, { color: C.navy }]}>
                المجموع / Total
              </Text>
              <Text style={[styles.tableColLeft, { color: C.navy }]}>
                {data.amount.toFixed(2)} DH
              </Text>
            </View>
          </View>

          {/* ═══════ CASHIER BOX ═══════ */}
          {data.cashierName && (
            <View style={styles.cashierBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cashierLabelAr}>
                  تم استلام المبلغ من طرف
                </Text>
                <Text style={styles.cashierLabelFr}>
                  Montant reçu par
                </Text>
                <Text style={styles.cashierValue}>{data.cashierName}</Text>
              </View>
              <View style={styles.cashierStamp}>
                <Text style={styles.cashierStampText}>موقّع ✓</Text>
              </View>
            </View>
          )}

          {/* ═══════ STAMP ═══════ */}
          <View style={styles.stamp}>
            <Text style={styles.stampAr}>مدفوع</Text>
            <Text style={styles.stampFr}>PAYÉ</Text>
          </View>
        </View>

        {/* ═══════ FOOTER ═══════ */}
        <View style={styles.footer}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabelAr}>
              {data.cashierName
                ? `توقيع ${data.cashierName.split('(')[0].trim()}`
                : 'توقيع المدرسة'}
            </Text>
            <Text style={styles.signatureLabelFr}>
              Signature de l'école
            </Text>
            <View style={styles.signatureLine} />
          </View>

          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabelAr}>توقيع ولي الأمر</Text>
            <Text style={styles.signatureLabelFr}>
              Signature du parent
            </Text>
            <View style={styles.signatureLine} />
          </View>
        </View>

        <Text style={styles.footerNote} fixed>
          وصل تم إنشاؤه تلقائياً — {data.schoolName} · Reçu généré automatiquement
        </Text>
      </Page>
    </Document>
  )
}