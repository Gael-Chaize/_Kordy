export type PdfDestination = {
  createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void>; abort?: () => Promise<void> }>
}

function isAccessDenied(error: unknown) {
  return error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')
}

let nativeSaveBlocked = false

function isEmbeddedBrowser() {
  return window.self !== window.top || /\b(?:Electron|VSCode)\b/i.test(navigator.userAgent)
}

export function pdfFilename(title: string) {
  const printable = [...title].map(char => char.charCodeAt(0) < 32 ? '_' : char).join('')
  return `${printable.replace(/[<>:"/\\|?*]/g, '_').trim().replace(/[. ]+$/, '') || 'Kordy'}.pdf`
}

export async function choosePdfDestination(title: string): Promise<PdfDestination | null> {
  const browser = window as Window & {
    showSaveFilePicker?: (options: object) => Promise<PdfDestination>
  }
  // Invoke directly from the click handler to preserve browser user activation.
  // VS Code previews can expose the picker while refusing its resulting handle.
  // Use one download dialog directly, instead of a picker followed by a fallback.
  if (browser.showSaveFilePicker && window.isSecureContext && !isEmbeddedBrowser() && !nativeSaveBlocked) {
    try {
      return await browser.showSaveFilePicker({
        suggestedName: pdfFilename(title),
        types: [{ description: 'PDF document', accept: { 'application/pdf': ['.pdf'] } }],
      })
    } catch (error) {
      if (!isAccessDenied(error)) throw error
      nativeSaveBlocked = true
    }
  }
  return null
}

export async function savePdfBlob(blob: Blob, title: string, destination: PdfDestination | null) {
  if (destination) {
    let writable: Awaited<ReturnType<PdfDestination['createWritable']>> | undefined
    try {
      writable = await destination.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (error) {
      if (writable?.abort) await writable.abort().catch(() => {})
      if (!isAccessDenied(error)) throw error
      nativeSaveBlocked = true
      // Embedded browsers may allow the picker but forbid writing to its handle.
      // Use their normal download flow instead of failing the PDF export.
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = pdfFilename(title)
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
