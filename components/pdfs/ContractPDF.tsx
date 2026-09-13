import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoBox: {
    width: 55,
    height: 55,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 55, height: 55, objectFit: 'contain' },
  logoPlaceholder: { fontSize: 22, fontWeight: 'bold', color: '#4F46E5' },
  schoolInfo: { flex: 1, marginLeft: 12 },
  schoolName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 2 },
  schoolSub: { fontSize: 9, color: '#64748B' },
  badge: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  badgeCancelled: { backgroundColor: '#DC2626' },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: { fontSize: 11, color: '#64748B', textAlign: 'center', marginBottom: 20 },

  section: { marginBottom: 15 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E293B',
    backgroundColor: '#F1F5F9',
    padding: 7,
    marginBottom: 8,
  },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  infoItem: { width: '50%', marginBottom: 8 },
  infoLabel: { fontSize: 9, color: '#64748B', marginBottom: 2 },
  infoValue: { fontSize: 11, color: '#1E293B', fontWeight: 'bold' },

  table: { borderWidth: 1, borderColor: '#E2E8F0' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableRowLast: { flexDirection: 'row', padding: 6 },
  th: { fontSize: 9, fontWeight: 'bold', color: '#475569' },
  td: { fontSize: 9, color: '#1E293B' },

  colService: { flex: 2 },
  colType: { flex: 1 },
  colPrice: { flex: 1, textAlign: 'right' },
  colDiscount: { flex: 1, textAlign: 'right' },
  colFinal: { flex: 1, textAlign: 'right' },
  colDate: { flex: 1, textAlign: 'right' },
  colAmount: { flex: 1, textAlign: 'right' },
  colStatus: { flex: 1, textAlign: 'center' },

  totalBox: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { fontSize: 11, color: '#1E293B' },
  totalValue: { fontSize: 11, fontWeight: 'bold' },
  grandTotal: { fontSize: 13, fontWeight: 'bold', color: '#4F46E5' },

  statusBadge: {
    fontSize: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPaid: { backgroundColor: '#D1FAE5', color: '#065F46' },
  statusPending: { backgroundColor: '#FEF3C7', color: '#92400E' },
  statusPartial: { backgroundColor: '#DBEAFE', color: '#1E40AF' },

  footer: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signBox: { width: 150 },
  signLabel: { fontSize: 10, color: '#64748B', textAlign: 'center', marginBottom: 3 },
  signLine: { borderTopWidth: 1, borderTopColor: '#94A3B8', marginTop: 45, paddingTop: 4 },
  signText: { fontSize: 8, color: '#64748B', textAlign: 'center' },

  footerNote: { fontSize: 8, color: '#94A3B8', textAlign: 'center', marginTop: 20 },

  cancelledWatermark: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    fontSize: 60,
    color: '#DC2626',
    opacity: 0.15,
    textAlign: 'center',
    fontWeight: 'bold',
    transform: 'rotate(-30deg)',
  },
})

function formatDate(d: string | null): string {
  if (!d) return '-'
  try {
    const date = new Date(d)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  } catch { return d }
}

export default function ContractPDF({ data }: { data: any }) {
  const isCancelled = data.contractStatus === 'cancelled'

  const getStatusLabel = (status: string) => {
    if (status === 'paid') return 'مدفوع'
    if (status === 'partially_paid') return 'جزئي'
    if (status === 'cancelled') return 'ملغى'
    return 'غير مدفوع'
  }

  const getStatusStyle = (status: string) => {
    if (status === 'paid') return styles.statusPaid
    if (status === 'partially_paid') return styles.statusPartial
    return styles.statusPending
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {isCancelled && (
          <Text style={styles.cancelledWatermark}>ملغى</Text>
        )}

        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={styles.logoBox}>
              {data.schoolLogo ? (
                <Image src={data.schoolLogo} style={styles.logo} />
              ) : (
                <Text style={styles.logoPlaceholder}>{data.schoolName.charAt(0)}</Text>
              )}
            </View>
            <View style={styles.schoolInfo}>
              <Text style={styles.schoolName}>{data.schoolName}</Text>
              {data.schoolAddress && <Text style={styles.schoolSub}>{data.schoolAddress}</Text>}
              {data.schoolPhone && <Text style={styles.schoolSub}>📞 {data.schoolPhone}</Text>}
            </View>
          </View>
          <View style={[styles.badge, isCancelled && styles.badgeCancelled]}>
            <Text style={styles.badgeText}>N° {data.contractNumber}</Text>
          </View>
        </View>

        {/* TITLE */}
        <Text style={styles.title}>عقد التسجيل</Text>
        <Text style={styles.subtitle}>Contrat d'inscription</Text>

        {/* INFOS ÉLÈVE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 معلومات التلميذ — Informations de l'élève</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>الاسم الكامل</Text>
              <Text style={styles.infoValue}>{data.studentName || '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>رمز مسار</Text>
              <Text style={styles.infoValue}>{data.massarCode || '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>تاريخ الازدياد</Text>
              <Text style={styles.infoValue}>{formatDate(data.birthDate)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>الجنس</Text>
              <Text style={styles.infoValue}>{data.gender || '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>السنة الدراسية</Text>
              <Text style={styles.infoValue}>{data.academicYear}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>المستوى / القسم</Text>
              <Text style={styles.infoValue}>{data.levelName} - {data.className}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>تاريخ البداية</Text>
              <Text style={styles.infoValue}>{formatDate(data.startDate)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>تاريخ النهاية</Text>
              <Text style={styles.infoValue}>{formatDate(data.endDate)}</Text>
            </View>
          </View>
        </View>

        {/* SERVICES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛠️ الخدمات المشترك فيها — Services souscrits</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colService]}>الخدمة</Text>
              <Text style={[styles.th, styles.colType]}>النوع</Text>
              <Text style={[styles.th, styles.colPrice]}>الثمن</Text>
              <Text style={[styles.th, styles.colDiscount]}>التخفيض</Text>
              <Text style={[styles.th, styles.colFinal]}>النهائي</Text>
            </View>
            {data.items.map((item: any, i: number) => (
              <View key={i} style={i === data.items.length - 1 ? styles.tableRowLast : styles.tableRow}>
                <Text style={[styles.td, styles.colService]}>{item.name}</Text>
                <Text style={[styles.td, styles.colType]}>
                  {item.type === 'monthly' ? 'شهري' : item.type === 'annual' ? 'سنوي' : 'مرة واحدة'}
                </Text>
                <Text style={[styles.td, styles.colPrice]}>{item.price.toFixed(2)} DH</Text>
                <Text style={[styles.td, styles.colDiscount]}>
                  {item.discount > 0 ? `- ${item.discount.toFixed(2)} DH` : '-'}
                </Text>
                <Text style={[styles.td, styles.colFinal, { fontWeight: 'bold' }]}>
                  {item.finalPrice.toFixed(2)} DH
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* INSTALLMENTS */}
        {data.installments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 الأقساط — Échéances</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.colService]}>الوصف</Text>
                <Text style={[styles.th, styles.colDate]}>الاستحقاق</Text>
                <Text style={[styles.th, styles.colAmount]}>المبلغ</Text>
                <Text style={[styles.th, styles.colAmount]}>المدفوع</Text>
                <Text style={[styles.th, styles.colStatus]}>الحالة</Text>
              </View>
              {data.installments.map((inst: any, i: number) => (
                <View key={i} style={i === data.installments.length - 1 ? styles.tableRowLast : styles.tableRow}>
                  <Text style={[styles.td, styles.colService]}>{inst.description}</Text>
                  <Text style={[styles.td, styles.colDate]}>{formatDate(inst.dueDate)}</Text>
                  <Text style={[styles.td, styles.colAmount]}>{inst.amount.toFixed(2)}</Text>
                  <Text style={[styles.td, styles.colAmount]}>{inst.paidAmount.toFixed(2)}</Text>
                  <View style={styles.colStatus}>
                    <Text style={[styles.statusBadge, getStatusStyle(inst.status)]}>
                      {getStatusLabel(inst.status)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TOTALS */}
         <View style={styles.totalBox}>
  {/* Prix mensuel des services */}
  <View style={styles.totalRow}>
    <Text style={styles.totalLabel}>المبلغ الشهري للخدمات</Text>
    <Text style={styles.totalValue}>{data.servicesTotal.toFixed(2)} DH</Text>
  </View>

  {/* Grand total = total à payer */}
  <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: '#C7D2FE', marginTop: 5, paddingTop: 8 }]}>
    <Text style={styles.grandTotal}>المبلغ الإجمالي للخدمات</Text>
    <Text style={styles.grandTotal}>{data.grandTotal.toFixed(2)} DH</Text>
  </View>

  {/* Payé */}
  <View style={styles.totalRow}>
    <Text style={styles.totalLabel}>المدفوع</Text>
    <Text style={[styles.totalValue, { color: '#166534' }]}>{data.totalPaid.toFixed(2)} DH</Text>
  </View>

  {/* Reste */}
  <View style={styles.totalRow}>
    <Text style={styles.totalLabel}>المتبقي</Text>
    <Text style={[styles.totalValue, { color: data.totalRemaining > 0 ? '#991B1B' : '#166534' }]}>
      {data.totalRemaining.toFixed(2)} DH
    </Text>
  </View>
</View>
        {/* NOTES */}
        {data.notes && (
          <View style={[styles.section, { marginTop: 12 }]}>
            <Text style={styles.sectionTitle}>📝 ملاحظات</Text>
            <Text style={{ fontSize: 10, color: '#475569', padding: 8, backgroundColor: '#F8FAFC', borderRadius: 6 }}>
              {data.notes}
            </Text>
          </View>
        )}

        {/* SIGNATURES */}
        <View style={styles.footer}>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>توقيع الإدارة</Text>
            <View style={styles.signLine}>
              <Text style={styles.signText}>المدير / السكرتيرة</Text>
            </View>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>توقيع ولي الأمر</Text>
            <View style={styles.signLine}>
              <Text style={styles.signText}>الأب / الأم</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footerNote}>
          تم إنشاء هذا العقد تلقائياً بواسطة GestionEco — {data.schoolName}
        </Text>

      </Page>
    </Document>
  )
}