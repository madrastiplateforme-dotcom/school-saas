import path from 'path'
import { Font } from '@react-pdf/renderer'

// ═══════════════════════════════════════════════════
// Détection : navigateur (client) vs serveur (Node)
// ═══════════════════════════════════════════════════
const isBrowser = typeof window !== 'undefined'

const FONTS_BASE = isBrowser
  ? '/fonts'
  : path.resolve(process.cwd(), 'public', 'fonts')

function fontSrc(filename: string): string {
  if (isBrowser) return `${FONTS_BASE}/${filename}`
  return path.join(FONTS_BASE, filename)
}

let registered = false

export function registerPdfFonts() {
  if (registered) return
  registered = true

  // ═══════════════════════════════════════════════════
  // 🎯 Amiri — arabe complet (avec 4 vrais variants)
  // ═══════════════════════════════════════════════════
  Font.register({
    family: 'Amiri',
    fonts: [
      { src: fontSrc('Amiri-Regular.ttf'),     fontWeight: 'normal', fontStyle: 'normal' },
      { src: fontSrc('Amiri-Italic.ttf'),      fontWeight: 'normal', fontStyle: 'italic' },
      { src: fontSrc('Amiri-Bold.ttf'),        fontWeight: 'bold',   fontStyle: 'normal' },
      { src: fontSrc('Amiri-BoldItalic.ttf'),  fontWeight: 'bold',   fontStyle: 'italic' },
    ],
  })

  // ═══════════════════════════════════════════════════
  // 🔑 Alias 'Cairo' → Amiri
  //    Les 6 PDFs utilisent fontFamily: 'Cairo'
  //    On pointe vers Amiri sans modifier les PDFs
  // ═══════════════════════════════════════════════════
  Font.register({
    family: 'Cairo',
    fonts: [
      { src: fontSrc('Amiri-Regular.ttf'),     fontWeight: 'normal', fontStyle: 'normal' },
      { src: fontSrc('Amiri-Italic.ttf'),      fontWeight: 'normal', fontStyle: 'italic' },
      { src: fontSrc('Amiri-Bold.ttf'),        fontWeight: 'bold',   fontStyle: 'normal' },
      { src: fontSrc('Amiri-BoldItalic.ttf'),  fontWeight: 'bold',   fontStyle: 'italic' },
    ],
  })

  // ═══════════════════════════════════════════════════
  // Ne pas couper les mots arabes (hyphenation OFF)
  // ═══════════════════════════════════════════════════
  Font.registerHyphenationCallback((word) => [word])
}