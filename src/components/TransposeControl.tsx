import { useState } from 'react'
import { previewFontSizes, type PreviewFontField } from '../music/previewSettings'

type Props = {
  value: number
  onChange: (value: number) => void
  chordFontSize: number
  lyricsFontSize: number
  sectionFontSize: number
  headerFontSize: number
  onFontSizeChange: (field: PreviewFontField, size: number) => void
  chordBold: boolean
  lyricsBold: boolean
  onBoldChange: (field: 'chordBold' | 'lyricsBold', bold: boolean) => void
  chordColor: string
  onChordColorChange: (color: string) => void
  gridColor: string
  onGridColorChange: (color: string) => void
  fitToA4: boolean
  a4PageCount: number
  onFitToA4Change: (enabled: boolean) => void
  exportingPdf: boolean
  onExportPdf: () => void
  onPrintPdf: () => void
}

export function TransposeControl({ value, onChange, chordFontSize, lyricsFontSize, sectionFontSize, headerFontSize, onFontSizeChange, chordBold, lyricsBold, onBoldChange, chordColor, onChordColorChange, gridColor, onGridColorChange, fitToA4, a4PageCount, onFitToA4Change, exportingPdf, onExportPdf, onPrintPdf }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <div className="preview-toolbar">
      <div className="preview-toolbar-row">
      <label className="transpose-control">
        <span>Transpose :</span>
        <input
          aria-label="Transpose"
          title="Semitones (-13 to +13)"
          className={value !== 0 ? 'transposed' : ''}
          type="text"
          inputMode="text"
          value={draft ?? (value > 0 ? `+${value}` : String(value))}
          onChange={event => {
            const text = event.target.value
            if (!/^[+-]?\d*$/.test(text)) return
            if (text === '' || text === '+' || text === '-') { setDraft(text); return }
            const next = Math.max(-13, Math.min(13, Number(text)))
            setDraft(next > 0 ? `+${next}` : String(next))
            onChange(next)
          }}
          onBlur={() => setDraft(null)}
          onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }}
        />
      </label>
      <label className="preview-a4-control">
        <input type="checkbox" role="switch" aria-label="Fit to A4 page" checked={fitToA4} disabled={exportingPdf}
          onChange={event => onFitToA4Change(event.target.checked)} />
        <span>Fit to A4 page</span>
        {fitToA4 && a4PageCount > 0 && <small className="preview-page-count" role="status">({a4PageCount} {a4PageCount === 1 ? 'page' : 'pages'})</small>}
      </label>
      <div className="preview-pdf-actions">
      <button type="button" className="secondary-button export-pdf-button" onClick={onExportPdf} disabled={exportingPdf}
        title="Save a PDF file">
        {exportingPdf ? 'Preparing PDF…' : 'Export PDF'}
      </button>
      <button type="button" className="secondary-button export-pdf-button" onClick={onPrintPdf} disabled={exportingPdf}>
        Print PDF
      </button>
      </div>
      </div>
      <div className="preview-toolbar-row">
      {([
        ['chordFontSize', 'Chord :', chordFontSize],
        ['lyricsFontSize', 'Lyrics :', lyricsFontSize],
        ['sectionFontSize', 'Section :', sectionFontSize],
        ['headerFontSize', 'Header :', headerFontSize],
      ] as const).map(([field, label, size]) => (
        <label className="preview-font-control" key={field}>
          <span>{label}</span>
          <select value={size} onChange={event => onFontSizeChange(field, Number(event.target.value))}>
            {previewFontSizes.map(option => <option key={option} value={option}>{option} px</option>)}
          </select>
        </label>
      ))}
      </div>
      <div className="preview-toolbar-row">
      <div className="preview-bold-controls" role="group" aria-label="Bold">
        <span>Bold :</span>
        <label>Chord <input type="checkbox" aria-label="Bold chord" checked={chordBold}
          onChange={event => onBoldChange('chordBold', event.target.checked)} /></label>
        <label>Lyrics <input type="checkbox" aria-label="Bold lyrics" checked={lyricsBold}
          onChange={event => onBoldChange('lyricsBold', event.target.checked)} /></label>
      </div>
      <label className="preview-color-control">
        <span>Chord color:</span>
        <input type="color" aria-label="Chord color" value={chordColor}
          onChange={event => onChordColorChange(event.target.value)} />
      </label>
      <label className="preview-color-control">
        <span>Grid color:</span>
        <input type="color" aria-label="Grid color" value={gridColor}
          onChange={event => onGridColorChange(event.target.value)} />
      </label>
      </div>
    </div>
  )
}
