export default function Amount({ value, currency = 'DH' }: { value: number; currency?: string }) {
  return (
    <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>
      {value.toLocaleString('fr-FR')} {currency}
    </span>
  )
}