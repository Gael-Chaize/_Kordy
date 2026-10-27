import { PDFDocument, rgb, pushGraphicsState, popGraphicsState, rectangle, clip, endPath, type PDFPage, type PDFFont } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import regularUrl from '@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff?url'
import boldUrl from '@fontsource/noto-sans/files/noto-sans-latin-800-normal.woff?url'
import { savePdfBlob, type PdfDestination } from './pdfDestination'

type Fonts = { regular: PDFFont; bold: PDFFont }

function parseColor(value: string) {
  const values = value.match(/[\d.]+/g)?.map(Number)
  if (!values || values.length < 3) return null
  return { color: rgb(values[0] / 255, values[1] / 255, values[2] / 255), opacity: values[3] ?? 1 }
}

function renderSheet(sheet: HTMLElement, page: PDFPage, fonts: Fonts) {
  const origin = sheet.getBoundingClientRect()
  const factor = page.getWidth() / origin.width
  const box = (rect: DOMRect) => ({
    x: (rect.left - origin.left) * factor,
    y: page.getHeight() - (rect.bottom - origin.top) * factor,
    width: rect.width * factor,
    height: rect.height * factor,
  })
  const fontFor = (css: CSSStyleDeclaration) => Number(css.fontWeight) >= 600 ? fonts.bold : fonts.regular
  const drawText = (text: string, left: number, top: number, css: CSSStyleDeclaration) => {
    const font = fontFor(css)
    const size = parseFloat(css.fontSize) * (origin.width / sheet.offsetWidth) * factor
    const color = parseColor(css.color)
    if (!color || !text) return
    page.drawText(text, {
      x: (left - origin.left) * factor,
      y: page.getHeight() - (top - origin.top) * factor - font.heightAtSize(size, { descender: false }),
      size, font, ...color,
    })
  }

  function renderText(node: Text, css: CSSStyleDeclaration) {
    if (!node.textContent?.trim()) return
    // Read actual browser line positions, including wrapped titles and clipped lyrics.
    const range = document.createRange()
    let run = ''
    let left = 0
    let top = 0
    const tracked = Math.abs(parseFloat(css.letterSpacing) || 0) > 0.001
    for (let i = 0; i < node.length; i++) {
      range.setStart(node, i)
      range.setEnd(node, i + 1)
      const rect = range.getBoundingClientRect()
      if (rect.width === 0) continue
      if (tracked) {
        drawText(node.data[i].replace(/\s/, ' '), rect.left, rect.top, css)
        continue
      }
      if (run && Math.abs(rect.top - top) > 0.5) {
        drawText(run, left, top, css)
        run = ''
      }
      if (!run) { left = rect.left; top = rect.top }
      run += node.data[i].replace(/\s/, ' ')
    }
    drawText(run, left, top, css)
  }

  function renderElement(element: HTMLElement) {
    const css = getComputedStyle(element)
    if (css.display === 'none' || css.visibility === 'hidden') return
    const rect = element.getBoundingClientRect()
    const bounds = box(rect)
    const scale = rect.width / (element.offsetWidth || 1)
    const background = parseColor(css.backgroundColor)
    if (background && background.opacity > 0) page.drawRectangle({ ...bounds, ...background, borderWidth: 0 })
    if (element !== sheet) {
      for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
        const width = parseFloat(css[`border${side}Width`]) * scale * factor
        const color = parseColor(css[`border${side}Color`])
        if (!width || !color) continue
        const horizontal = side === 'Top' || side === 'Bottom'
        const coordinate = side === 'Top' ? bounds.y + bounds.height - width / 2
          : side === 'Bottom' ? bounds.y + width / 2
          : side === 'Left' ? bounds.x + width / 2 : bounds.x + bounds.width - width / 2
        page.drawLine({
          start: horizontal ? { x: bounds.x, y: coordinate } : { x: coordinate, y: bounds.y },
          end: horizontal ? { x: bounds.x + bounds.width, y: coordinate } : { x: coordinate, y: bounds.y + bounds.height },
          thickness: width, ...color,
        })
      }
    }

    const clipped = css.overflowX === 'hidden' || css.overflowY === 'hidden'
    if (clipped) page.pushOperators(pushGraphicsState(), rectangle(bounds.x, bounds.y, bounds.width, bounds.height), clip(), endPath())
    const before = getComputedStyle(element, '::before')
    if (before.content === '"|"') {
      const text = [...element.childNodes].find(node => node.nodeType === Node.TEXT_NODE)
      const range = document.createRange()
      if (text) range.selectNodeContents(text)
      const textTop = text ? range.getBoundingClientRect().top : rect.top
      drawText('|', rect.left + (parseFloat(css.paddingLeft) + parseFloat(before.marginLeft || '0')) * scale, textTop, css)
    }
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) renderText(child as Text, css)
      else if (child instanceof HTMLElement) renderElement(child)
    }
    if (clipped) page.pushOperators(popGraphicsState())
  }

  renderElement(sheet)
}

export async function exportPdf(title: string, destination: PdfDestination | null) {
  const sheets = [...document.querySelectorAll<HTMLElement>('.a4-pages .a4-page')]
  if (!sheets.length) throw new Error('No A4 pages are ready for export.')
  await document.fonts.ready
  const documentPdf = await PDFDocument.create()
  documentPdf.registerFontkit(fontkit)
  const fontData = await Promise.all([regularUrl, boldUrl].map(async url => {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Could not load the PDF font.')
    return response.arrayBuffer()
  }))
  const [regular, bold] = await Promise.all(fontData.map(data => documentPdf.embedFont(data, { subset: true })))
  documentPdf.setTitle(title)
  documentPdf.setCreator('Kordy')
  for (const sheet of sheets) {
    renderSheet(sheet, documentPdf.addPage([210 * 72 / 25.4, 297 * 72 / 25.4]), { regular, bold })
  }
  const bytes = await documentPdf.save()
  const blob = new Blob([new Uint8Array(bytes).buffer], { type: 'application/pdf' })
  await savePdfBlob(blob, title, destination)
}
