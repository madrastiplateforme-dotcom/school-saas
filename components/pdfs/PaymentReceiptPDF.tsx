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
import path from 'path'

Font.register({
  family: 'Cairo',
  fonts: [
    { src: path.join(process.cwd(), 'public', 'fonts', 'Cairo-Regular.ttf') },
    { src: path.join(process.cwd(), 'public', 'fonts', 'Cairo-Bold.ttf'), fontWeight: 'bold' },
  ],
})

Font.registerHyphenationCallback((word) => [word])

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
    padding: 40,
    fontSize: 11,
    fontFamily: 'Cairo',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#4F46E5',
    paddingBottom: 15,
    marginBottom: 20,
  },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: 'contain',
  },
  logoPlaceholder: {
    fontSize: 24,
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  schoolInfo: {
    flex: 1,
    marginLeft: 15,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 3,
  },
  schoolSub: {
    fontSize: 10,
    color: '#64748B',
  },
  receiptBadge: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  receiptBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 25,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  infoItem: {
    width: '50%',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 9,
    color: '#64748B',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: 'bold',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginVertical: 15,
  },
  amountBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginVertical: 15,
  },
  amountLabel: {
    fontSize: 10,
    color: '#166534',
    marginBottom: 5,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#166534',
  },
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  tableColLeft: {
    flex: 1,
    fontSize: 10,
    color: '#1E293B',
  },
  tableColRight: {
    width: 120,
    fontSize: 10,
    color: '#1E293B',
    textAlign: 'right',
  },
  tableHeaderText: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  // ✅ Caisse info box
  cashierBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    padding: 12,
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cashierLabel: {
    fontSize: 9,
    color: '#92400E',
    marginBottom: 2,
  },
  cashierValue: {
    fontSize: 12,
    color: '#78350F',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: 150,
    alignItems: 'center',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#94A3B8',
    width: 150,
    marginTop: 40,
    paddingTop: 5,
  },
  signatureText: {
    fontSize: 9,
    color: '#64748B',
  },
  footerNote: {
    fontSize: 8,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 5,
  },
  stamp: {
    position: 'absolute',
    top: 100,
    right: 50,
    borderWidth: 2,
    borderColor: '#86EFAC',
    borderRadius: 50,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'rotate(-15deg)',
  },
  stampText: {
    fontSize: 10,
    color: '#166534',
    fontWeight: 'bold',
    textAlign: 'center',
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
  cash: 'Espèces / نقدا',
  bank_transfer: 'Virement / تحويل بنكي',
  transfer: 'Virement / تحويل بنكي',
  check: 'Chèque / شيك',
  cheque: 'Chèque / شيك',
  card: 'Carte / بطاقة',
  other: 'Autre / أخرى',
}

export default function PaymentReceiptPDF({ data }: { data: ReceiptData }) {
  const methodLabel = methodLabels[data.method] || data.method

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={styles.logoBox}>
              {data.schoolLogo ? (
                <Image src={data.schoolLogo} style={styles.logo} />
              ) : (
                <Text style={styles.logoPlaceholder}>
                  {data.schoolName.charAt(0)}
                </Text>
              )}
            </View>
            <View style={styles.schoolInfo}>
              <Text style={styles.schoolName}>{data.schoolName}</Text>
              {data.schoolAddress && <Text style={styles.schoolSub}>{data.schoolAddress}</Text>}
              {data.schoolPhone && <Text style={styles.schoolSub}>📞 {data.schoolPhone}</Text>}
            </View>
          </View>
          <View style={styles.receiptBadge}>
            <Text style={styles.receiptBadgeText}>N° {data.receiptNumber}</Text>
          </View>
        </View>

        {/* TITLE */}
        <Text style={styles.title}>REÇU DE PAIEMENT</Text>
        <Text style={styles.subtitle}>وصل الدفع</Text>

        {/* INFO GRID */}
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date de paiement</Text>
            <Text style={styles.infoValue}>{formatDate(data.paymentDate)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>N° Reçu</Text>
            <Text style={styles.infoValue}>{data.receiptNumber}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Élève / التلميذ</Text>
            <Text style={styles.infoValue}>{data.studentName || '—'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Mode de paiement</Text>
            <Text style={styles.infoValue}>{methodLabel}</Text>
          </View>
          {data.reference && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Référence</Text>
              <Text style={styles.infoValue}>{data.reference}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* AMOUNT */}
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>MONTANT PAYÉ / المبلغ المدفوع</Text>
          <Text style={styles.amountValue}>
            {data.amount.toFixed(2)} DH
          </Text>
        </View>

        {/* DETAILS TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableColLeft, styles.tableHeaderText]}>
              Description
            </Text>
            <Text style={[styles.tableColRight, styles.tableHeaderText]}>
              Montant
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableColLeft}>
              {data.description || 'Frais de scolarité'}
            </Text>
            <Text style={styles.tableColRight}>
              {data.amount.toFixed(2)} DH
            </Text>
          </View>
          <View style={[styles.tableRow, { backgroundColor: '#F8FAFC' }]}>
            <Text style={[styles.tableColLeft, { fontWeight: 'bold' }]}>
              Total
            </Text>
            <Text style={[styles.tableColRight, { fontWeight: 'bold' }]}>
              {data.amount.toFixed(2)} DH
            </Text>
          </View>
        </View>

        {/* ✅ CASHIER BOX */}
        {data.cashierName && (
          <View style={styles.cashierBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cashierLabel}>تم استلام المبلغ من طرف</Text>
              <Text style={styles.cashierValue}>{data.cashierName}</Text>
            </View>
            <Text style={{ fontSize: 9, color: '#92400E' }}>
              ✅ موقّع
            </Text>
          </View>
        )}

        {/* STAMP */}
        <View style={styles.stamp}>
          <Text style={styles.stampText}>PAYÉ{'\n'}مدفوع</Text>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureText}>
                {data.cashierName ? `توقيع ${data.cashierName.split('(')[0].trim()}` : 'Signature École'}
              </Text>
            </View>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureText}>توقيع ولي الأمر</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footerNote} fixed>
          Ce reçu est généré automatiquement par {data.schoolName} — Merci de conserver ce document.
        </Text>

      </Page>
    </Document>
  )
}