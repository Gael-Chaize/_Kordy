export type PdfDestination = {
  createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>
}

export function pdfFilename(title: string) {
  const printable = [...title].map(char => char.charCodeAt(0) < 32 ? '_' : char).join('')
  return `${printable.replace(/[<>:"/\\|?*]/g, '_').trim().replace(/[. ]+$/, '') || 'Kordy'}.pdf`
}

export function choosePdfDestination(title: string): Promise<PdfDestination | null> {
  const browser = window as Window & {
    showSaveFilePicker?: (options: object) => Promise<PdfDestination>
  }
  // Invoke directly from the click handler to preserve browser user activation.
  if (browser.showSaveFilePicker && window.isSecureContext) {
    return browser.showSaveFilePicker({
      suggestedName: pdfFilename(title),
      types: [{ description: 'PDF document', accept: { 'application/pdf': ['.pdf'] } }],
    })
  }
  return Promise.resolve(null)
}
