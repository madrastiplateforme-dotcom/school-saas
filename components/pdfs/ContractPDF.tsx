import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer'
import path from 'path'

// ═══════════════════════════════════════════════════
// Fonts — Cairo (4 variants)
// ═══════════════════════════════════════════════════
const FONTS_DIR = path.resolve(process.cwd(), 'public', 'fonts')

Font.register({
  family: 'Cairo',
  fonts: [
    { src: path.join(FONTS_DIR, 'Cairo-Regular.ttf'), fontWeight: 'normal', fontStyle: 'normal' },
    { src: path.join(FONTS_DIR, 'Cairo-Regular.ttf'), fontWeight: 'normal', fontStyle: 'italic' },
    { src: path.join(FONTS_DIR, 'Cairo-Bold.ttf'), fontWeight: 'bold', fontStyle: 'normal' },
    { src: path.join(FONTS_DIR, 'Cairo-Bold.ttf'), fontWeight: 'bold', fontStyle: 'italic' },
  ],
})

Font.registerHyphenationCallback((word) => [word])

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
const ORANGE = '#ea580c'
const ROSE = '#dc2626'

// ═══════════════════════════════════════════════════
// 🎯 DYNAMIC SIZING
// ═══════════════════════════════════════════════════
function getDynamicSizes(totalRows: number) {
  if (totalRows <= 8) {
    return {
      contentPadding: 38, contentPaddingTop: 32,
      fontSize: 9,
      sectionMarginBottom: 10,
      rowPadding: 5,
      tableHeaderPadding: 5,
      infoGridPadding: 8,
      infoGridMarginBottom: 0,
      infoItemMarginBottom: 4,
      titleSize: 20, titleFrSize: 11,
      titleMarginTop: 8, titleMarginBottom: 12,
      headerMarginBottom: 10,
      signMarginTop: 15, signPaddingTop: 10,
      signLabelFrMarginBottom: 40,
    }
  }
  if (totalRows <= 14) {
    return {
      contentPadding: 30, contentPaddingTop: 26,
      fontSize: 8.5,
      sectionMarginBottom: 8,
      rowPadding: 4,
      tableHeaderPadding: 4,
      infoGridPadding: 6,
      infoGridMarginBottom: 0,
      infoItemMarginBottom: 3,
      titleSize: 18, titleFrSize: 10,
      titleMarginTop: 6, titleMarginBottom: 9,
      headerMarginBottom: 8,
      signMarginTop: 12, signPaddingTop: 8,
      signLabelFrMarginBottom: 32,
    }
  }
  if (totalRows <= 20) {
    return {
      contentPadding: 24, contentPaddingTop: 20,
      fontSize: 8,
      sectionMarginBottom: 6,
      rowPadding: 3,
      tableHeaderPadding: 3.5,
      infoGridPadding: 5,
      infoGridMarginBottom: 0,
      infoItemMarginBottom: 2,
      titleSize: 16, titleFrSize: 9,
      titleMarginTop: 4, titleMarginBottom: 7,
      headerMarginBottom: 6,
      signMarginTop: 10, signPaddingTop: 6,
      signLabelFrMarginBottom: 28,
    }
  }
  return {
    contentPadding: 20, contentPaddingTop: 16,
    fontSize: 7.5,
    sectionMarginBottom: 5,
    rowPadding: 2.5,
    tableHeaderPadding: 3,
    infoGridPadding: 4,
    infoItemMarginBottom: 2,
    titleSize: 14, titleFrSize: 8,
    titleMarginTop: 3, titleMarginBottom: 6,
    headerMarginBottom: 5,
    signMarginTop: 8, signPaddingTop: 5,
    signLabelFrMarginBottom: 22,
  }
}

function formatDate(d: string | null): string {
  if (!d) return '-'
  try {
    const date = new Date(d)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return d
  }
}

export default function ContractPDF({ data }: { data: any }) {
  const isCancelled = data.contractStatus === 'cancelled'

  const getStatusLabel = (status: string) => {
    if (status === 'paid') return 'مدفوع'
    if (status === 'partially_paid') return 'جزئي'
    if (status === 'cancelled') return 'ملغى'
    return 'غير مدفوع'
  }

  // 🎯 Calcule total rows
  const totalRows =
    (data.items?.length || 0) + (data.installments?.length || 0)
  const S = getDynamicSizes(totalRows)

  const styles = StyleSheet.create({
    page: {
      padding: 0,
      fontFamily: 'Cairo',
      fontSize: S.fontSize,
      direction: 'rtl',
    },

    outerFrame: {
      position: 'absolute',
      top: 18, left: 18, right: 18, bottom: 18,
      borderWidth: 2.5, borderColor: C.navy, borderRadius: 4,
    },
    innerFrame: {
      position: 'absolute',
      top: 25, left: 25, right: 25, bottom: 25,
      borderWidth: 0.8, borderColor: C.gold, borderRadius: 2,
    },

    content: {
      padding: S.contentPadding,
      paddingTop: S.contentPaddingTop,
    },

    header: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 10,
      borderBottomWidth: 2,
      borderBottomColor: C.navy,
      marginBottom: S.headerMarginBottom,
    },
    logoBox: {
      width: 50, height: 50, borderRadius: 6,
      backgroundColor: C.lightGold,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: C.gold,
    },
    logoImg: { width: 50, height: 50, borderRadius: 6 },
    logoPlaceholder: { fontSize: 20, color: C.navy, fontWeight: 'bold' },
    headerCenter: { flex: 1, textAlign: 'center', paddingHorizontal: 10 },
    kingdomAr: { fontSize: 10, fontWeight: 'bold', color: C.navy, textAlign: 'center' },
    kingdomFr: { fontSize: 8, fontWeight: 'bold', color: C.navy, textAlign: 'center', marginTop: 0.5 },
    schoolAr: { fontSize: 13, fontWeight: 'bold', color: C.gold, textAlign: 'center', marginTop: 5 },
    schoolMeta: { fontSize: 8, color: C.gray, textAlign: 'center', marginTop: 2 },
    badge: {
      backgroundColor: C.navy,
      paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: 4, minWidth: 90, textAlign: 'center',
    },
    badgeCancelled: { backgroundColor: ROSE },
    badgeText: {
      color: '#ffffff', fontSize: 8.5, fontWeight: 'bold', textAlign: 'center',
    },

    titleBox: {
      alignItems: 'center',
      marginTop: S.titleMarginTop,
      marginBottom: S.titleMarginBottom,
    },
    titleAr: {
      fontSize: S.titleSize, fontWeight: 'bold', color: C.navy, textAlign: 'center',
    },
    titleFr: {
      fontSize: S.titleFrSize, fontWeight: 'bold', color: C.gold,
      textAlign: 'center', letterSpacing: 1.5, marginTop: 2,
    },
    titleDivider: {
      width: 160, height: 1.5, backgroundColor: C.gold, marginTop: 6,
    },

    section: { marginBottom: S.sectionMarginBottom },
    sectionHeader: {
      backgroundColor: C.navy, borderRadius: 3,
      paddingVertical: 5, paddingHorizontal: 10,
      marginBottom: 5,
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitleAr: { fontSize: 10, fontWeight: 'bold', color: '#ffffff', textAlign: 'right' },
    sectionTitleFr: { fontSize: 8, color: C.lightGold, textAlign: 'left', fontStyle: 'italic' },

    infoGrid: {
      flexDirection: 'row-reverse', flexWrap: 'wrap',
      backgroundColor: '#fafafa', borderRadius: 3,
      padding: S.infoGridPadding,
      borderLeftWidth: 3, borderLeftColor: C.gold,
    },
    infoItem: {
      width: '50%',
      paddingVertical: 3,
      paddingHorizontal: 4,
      marginBottom: S.infoItemMarginBottom,
    },
    infoLabelAr: { fontSize: 7.5, color: C.gray, textAlign: 'right', marginBottom: 1 },
    infoLabelFr: { fontSize: 6.5, color: C.gray, textAlign: 'right', fontStyle: 'italic' },
    infoValue: {
      fontSize: 9.5, color: C.dark, fontWeight: 'bold',
      marginTop: 1.5, textAlign: 'right',
    },

    table: {
      borderWidth: 1, borderColor: C.navy, borderRadius: 3, overflow: 'hidden',
    },
    tableHeader: {
      flexDirection: 'row-reverse', backgroundColor: C.navy,
      paddingVertical: S.tableHeaderPadding,
    },
    th: {
      color: '#ffffff', fontSize: 8, fontWeight: 'bold',
      textAlign: 'center', paddingHorizontal: 3,
    },
    tableRow: {
      flexDirection: 'row-reverse',
      borderBottomWidth: 0.5,
      borderBottomColor: '#e5e5e5',
      borderBottomStyle: 'dotted',
      paddingVertical: S.rowPadding,
      alignItems: 'center',
    },
    tableRowAlt: { backgroundColor: '#fafafa' },
    tableRowLast: {
      flexDirection: 'row-reverse',
      paddingVertical: S.rowPadding,
      alignItems: 'center',
    },
    td: {
      fontSize: 8.5, color: C.dark, paddingHorizontal: 3, textAlign: 'center',
    },
    tdRight: {
      fontSize: 8.5, color: C.dark, paddingHorizontal: 3, textAlign: 'right',
    },

    colService: { flex: 2.2, textAlign: 'right' },
    colType: { flex: 1, textAlign: 'center' },
    colPrice: { flex: 1, textAlign: 'center' },
    colDiscount: { flex: 1, textAlign: 'center' },
    colFinal: { flex: 1, textAlign: 'center' },
    colDate: { flex: 1, textAlign: 'center' },
    colAmount: { flex: 1, textAlign: 'center' },
    colStatus: { flex: 1, textAlign: 'center' },

    statusBadge: {
      fontSize: 7.5, paddingHorizontal: 4, paddingVertical: 2,
      borderRadius: 4, textAlign: 'center',
    },
    statusPaid: { backgroundColor: '#D1FAE5', color: '#065F46' },
    statusPending: { backgroundColor: '#FEF3C7', color: '#92400E' },
    statusPartial: { backgroundColor: '#DBEAFE', color: '#1E40AF' },

    totalBox: {
      backgroundColor: C.lightGold, borderWidth: 1, borderColor: C.gold,
      borderRadius: 4, padding: 10, marginTop: 10,
    },
    totalRow: {
      flexDirection: 'row-reverse', justifyContent: 'space-between',
      paddingVertical: 3, alignItems: 'center',
    },
    totalLabelAr: { fontSize: 9.5, color: C.navy, textAlign: 'right', fontWeight: 'bold' },
    totalValue: { fontSize: 10, fontWeight: 'bold', color: C.dark, textAlign: 'left' },
    grandDivider: { borderTopWidth: 1, borderTopColor: C.gold, marginVertical: 5 },
    grandTotal: { fontSize: 12, fontWeight: 'bold', color: C.navy },

    notesBox: {
      backgroundColor: '#fdfdf9', borderWidth: 1, borderColor: C.line,
      borderStyle: 'dashed', borderRadius: 3, padding: 8, marginTop: 8,
    },
    notesLabel: {
      fontSize: 8, color: C.gray, marginBottom: 3,
      textAlign: 'right', fontWeight: 'bold',
    },
    notesText: { fontSize: 9, color: C.dark, lineHeight: 1.5, textAlign: 'right' },

    footer: {
      flexDirection: 'row-reverse', justifyContent: 'space-between',
      marginTop: S.signMarginTop,
      paddingTop: S.signPaddingTop,
      borderTopWidth: 1, borderTopColor: C.gold,
    },
    signBox: { width: 180, alignItems: 'center' },
    signLabelAr: { fontSize: 9, color: C.navy, fontWeight: 'bold', textAlign: 'center' },
    signLabelFr: {
      fontSize: 7, color: C.gray, textAlign: 'center',
      marginBottom: S.signLabelFrMarginBottom, fontStyle: 'italic',
    },
    signLine: {
      width: '100%', borderTopWidth: 1, borderTopColor: C.navy, marginTop: 15,
    },
    signText: { fontSize: 8, color: C.gray, textAlign: 'center', marginTop: 3 },

    footerNote: {
      fontSize: 7, color: C.gray, textAlign: 'center', marginTop: 12, fontStyle: 'italic',
    },

    cancelledWatermark: {
      position: 'absolute', top: '40%', left: 0, right: 0,
      fontSize: 70, color: ROSE, opacity: 0.13, textAlign: 'center',
      fontWeight: 'bold', transform: 'rotate(-30deg)',
    },
  })

  const getStatusStyle = (status: string) => {
    if (status === 'paid') return styles.statusPaid
    if (status === 'partially_paid') return styles.statusPartial
    return styles.statusPending
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.outerFrame} />
        <View style={styles.innerFrame} />

        {isCancelled && <Text style={styles.cancelledWatermark}>ملغى</Text>}

        <View style={styles.content}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              {data.schoolLogo ? (
                <Image src={data.schoolLogo} style={styles.logoImg} />
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
                <Text style={styles.schoolMeta}>{data.schoolAddress}</Text>
              )}
              {data.schoolPhone && (
                <Text style={styles.schoolMeta}>📞 {data.schoolPhone}</Text>
              )}
            </View>

            <View style={[styles.badge, isCancelled && styles.badgeCancelled]}>
              <Text style={styles.badgeText}>N° {data.contractNumber}</Text>
            </View>
          </View>

          {/* TITLE */}
          <View style={styles.titleBox}>
            <Text style={styles.titleAr}>عقد التسجيل</Text>
            <Text style={styles.titleFr}>CONTRAT D'INSCRIPTION</Text>
            <View style={styles.titleDivider} />
          </View>

          {/* STUDENT INFO */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleAr}>معلومات التلميذ(ة)</Text>
              <Text style={styles.sectionTitleFr}>Informations de l'élève</Text>
            </View>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabelAr}>الاسم الكامل</Text>
                <Text style={styles.infoLabelFr}>Nom complet</Text>
                <Text style={styles.infoValue}>{data.studentName || '-'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabelAr}>رمز مسار</Text>
                <Text style={styles.infoLabelFr}>Code Massar</Text>
                <Text style={styles.infoValue}>{data.massarCode || '-'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabelAr}>تاريخ الازدياد</Text>
                <Text style={styles.infoLabelFr}>Date de naissance</Text>
                <Text style={styles.infoValue}>{formatDate(data.birthDate)}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabelAr}>الجنس</Text>
                <Text style={styles.infoLabelFr}>Genre</Text>
                <Text style={styles.infoValue}>{data.gender || '-'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabelAr}>السنة الدراسية</Text>
                <Text style={styles.infoLabelFr}>Année scolaire</Text>
                <Text style={styles.infoValue}>{data.academicYear}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabelAr}>المستوى / القسم</Text>
                <Text style={styles.infoLabelFr}>Niveau / Classe</Text>
                <Text style={styles.infoValue}>
                  {data.levelName} - {data.className}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabelAr}>تاريخ البداية</Text>
                <Text style={styles.infoLabelFr}>Date de début</Text>
                <Text style={styles.infoValue}>{formatDate(data.startDate)}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabelAr}>تاريخ النهاية</Text>
                <Text style={styles.infoLabelFr}>Date de fin</Text>
                <Text style={styles.infoValue}>{formatDate(data.endDate)}</Text>
              </View>
            </View>
          </View>

          {/* SERVICES */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleAr}>الخدمات المشترك فيها</Text>
              <Text style={styles.sectionTitleFr}>Services souscrits</Text>
            </View>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.colService]}>الخدمة</Text>
                <Text style={[styles.th, styles.colType]}>النوع</Text>
                <Text style={[styles.th, styles.colPrice]}>الثمن</Text>
                <Text style={[styles.th, styles.colDiscount]}>التخفيض</Text>
                <Text style={[styles.th, styles.colFinal]}>النهائي</Text>
              </View>
              {data.items.map((item: any, i: number) => (
                <View
                  key={i}
                  style={[
                    i === data.items.length - 1 ? styles.tableRowLast : styles.tableRow,
                    i % 2 === 1 ? styles.tableRowAlt : {},
                  ]}
                >
                  <Text style={[styles.tdRight, styles.colService, { fontWeight: 'bold', color: C.navy }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.td, styles.colType]}>
                    {item.type === 'monthly' ? 'شهري' : item.type === 'annual' ? 'سنوي' : 'مرة واحدة'}
                  </Text>
                  <Text style={[styles.td, styles.colPrice]}>
                    {item.price.toFixed(2)} DH
                  </Text>
                  <Text style={[styles.td, styles.colDiscount]}>
                    {item.discount > 0 ? `- ${item.discount.toFixed(2)} DH` : '-'}
                  </Text>
                  <Text style={[styles.td, styles.colFinal, { fontWeight: 'bold', color: C.navy }]}>
                    {item.finalPrice.toFixed(2)} DH
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* INSTALLMENTS */}
          {data.installments.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitleAr}>الأقساط</Text>
                <Text style={styles.sectionTitleFr}>Échéances</Text>
              </View>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, styles.colService]}>الوصف</Text>
                  <Text style={[styles.th, styles.colDate]}>الاستحقاق</Text>
                  <Text style={[styles.th, styles.colAmount]}>المبلغ</Text>
                  <Text style={[styles.th, styles.colAmount]}>المدفوع</Text>
                  <Text style={[styles.th, styles.colStatus]}>الحالة</Text>
                </View>
                {data.installments.map((inst: any, i: number) => (
                  <View
                    key={i}
                    style={[
                      i === data.installments.length - 1 ? styles.tableRowLast : styles.tableRow,
                      i % 2 === 1 ? styles.tableRowAlt : {},
                    ]}
                  >
                    <Text style={[styles.tdRight, styles.colService, { fontWeight: 'bold', color: C.navy }]}>
                      {inst.description}
                    </Text>
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
            <View style={styles.totalRow}>
              <Text style={styles.totalLabelAr}>المبلغ الشهري للخدمات</Text>
              <Text style={styles.totalValue}>{data.servicesTotal.toFixed(2)} DH</Text>
            </View>
            <View style={styles.grandDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.grandTotal}>المبلغ الإجمالي للخدمات</Text>
              <Text style={styles.grandTotal}>{data.grandTotal.toFixed(2)} DH</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabelAr}>المدفوع</Text>
              <Text style={[styles.totalValue, { color: EMERALD }]}>
                {data.totalPaid.toFixed(2)} DH
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabelAr}>المتبقي</Text>
              <Text style={[styles.totalValue, { color: data.totalRemaining > 0 ? ROSE : EMERALD }]}>
                {data.totalRemaining.toFixed(2)} DH
              </Text>
            </View>
          </View>

          {/* NOTES */}
          {data.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>ملاحظات / Notes</Text>
              <Text style={styles.notesText}>{data.notes}</Text>
            </View>
          )}

          {/* SIGNATURES */}
          <View style={styles.footer}>
            <View style={styles.signBox}>
              <Text style={styles.signLabelAr}>توقيع الإدارة</Text>
              <Text style={styles.signLabelFr}>Signature de l'administration</Text>
              <View style={styles.signLine} />
              <Text style={styles.signText}>المدير(ة) / السكرتيرة</Text>
            </View>
            <View style={styles.signBox}>
              <Text style={styles.signLabelAr}>توقيع ولي الأمر</Text>
              <Text style={styles.signLabelFr}>Signature du parent</Text>
              <View style={styles.signLine} />
              <Text style={styles.signText}>الأب / الأم</Text>
            </View>
          </View>

          <Text style={styles.footerNote}>
            تم إنشاء هذا العقد تلقائياً بواسطة GestionEco — {data.schoolName}
          </Text>
        </View>
      </Page>
    </Document>
  )
}