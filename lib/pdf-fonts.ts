import path from 'path'
import { Font } from '@react-pdf/renderer'

// Détecte si on est côté navigateur (client) ou serveur (Node)
const isBrowser = typeof window !== 'undefined'

// En browser: Next.js sert /public/* à la racine → URL = /fonts/...
// En serveur: on utilise le chemin absolu
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

  Font.register({
    family: 'Cairo',
    fonts: [
      { src: fontSrc('Cairo-Regular.ttf'), fontWeight: 'normal', fontStyle: 'normal' },
      { src: fontSrc('Cairo-Regular.ttf'), fontWeight: 'normal', fontStyle: 'italic' },
      { src: fontSrc('Cairo-Bold.ttf'), fontWeight: 'bold', fontStyle: 'normal' },
      { src: fontSrc('Cairo-Bold.ttf'), fontWeight: 'bold', fontStyle: 'italic' },
    ],
  })

  Font.registerHyphenationCallback((word) => [word])
}