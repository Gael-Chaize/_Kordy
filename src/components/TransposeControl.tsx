import { useState } from 'react'
import { previewFontSizes } from '../music/previewSettings'

type Props = {
  value: number
  onChange: (value: number) => void
  chordFontSize: number
  lyricsFontSize: number
  onFontSizeChange: (field: 'chordFontSize' | 'lyricsFontSize', size: number) => void
  chordBold: boolean
  lyricsBold: boolean
  onBoldChange: (field: 'chordBold' | 'lyricsBold', bold: boolean) => void
  chordColor: string
  onChordColorChange: (color: string) => void
  gridColor: string
  onGridColorChange: (color: string) => void
}

export function TransposeControl({ value, onChange, chordFontSize, lyricsFontSize, onFontSizeChange, chordBold, lyricsBold, onBoldChange, chordColor, onChordColorChange, gridColor, onGridColorChange }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <div className="preview-toolbar">
      <label className="transpose-control">
        <span>Transpose :</span>
        <input
          aria-label="Transpose"
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
      <span className="transpose-hint">Semitones (−13 to +13)</span>
      {([
        ['chordFontSize', 'Chord :', chordFontSize],
        ['lyricsFontSize', 'Lyrics :', lyricsFontSize],
      ] as const).map(([field, label, size]) => (
        <label className="preview-font-control" key={field}>
          <span>{label}</span>
          <select value={size} onChange={event => onFontSizeChange(field, Number(event.target.value))}>
            {previewFontSizes.map(option => <option key={option} value={option}>{option} px</option>)}
          </select>
        </label>
      ))}
      <div className="preview-bold-controls" role="group" aria-label="Bold">
        <span>Bold :</span>
        <label>Chord <input type="checkbox" aria-label="Bold chord" checked={chordBold}
          onChange={event => onBoldChange('chordBold', event.target.checked)} /></label>
        <label>Lyrics <input type="checkbox" aria-label="Bold lyrics" checked={lyricsBold}
          onChange={event => onBoldChange('lyricsBold', event.target.checked)} /></label>
      </div>
      <div className="preview-color-row">
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
