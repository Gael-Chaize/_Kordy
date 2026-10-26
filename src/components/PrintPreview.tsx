import type { Song } from '../music/types'
import { transposeBar } from '../music/transpose'
import type { CSSProperties } from 'react'
import { defaultPreviewFontSize, defaultChordColor, defaultGridColor } from '../music/previewSettings'

type PrintPreviewProps = {
  song: Song
  activeBarId: string | null
  activeSectionId: string | null
  activeChord: { barId: string; chordIndex: number | null } | null
}

export function PrintPreview({ song, activeBarId, activeSectionId, activeChord }: PrintPreviewProps) {
  const getTokens = (text: string) => getChordTokens(transposeBar(text, song.transpose ?? 0))
  return (
    <article className="print-preview" aria-label="Printable chord chart preview" style={{
      '--preview-chord-size': `${song.chordFontSize ?? defaultPreviewFontSize}px`,
      '--preview-lyrics-size': `${song.lyricsFontSize ?? defaultPreviewFontSize}px`,
      '--preview-chord-weight': song.chordBold === false ? 400 : 800,
      '--preview-chord-color': song.chordColor ?? defaultChordColor,
      '--preview-grid-color': song.gridColor ?? defaultGridColor,
      '--preview-lyrics-weight': song.lyricsBold === false ? 400 : 800,
    } as CSSProperties}>
      <header className="print-chart-header">
        <div className="print-chart-meta">
          <p className="print-eyebrow">Chord chart</p>
          <div className="print-title-row">
            <div>
              <h1>{song.title}</h1>
              <p className="print-artist">{song.artist}</p>
            </div>
          </div>
        </div>
        <div className="print-right-meta">
          <p className="print-style">{song.style}</p>
          <p className="print-tempo">Tempo: {song.tempo}</p>
        </div>
      </header>

      <div className="print-sections">
        {song.sections.map((section) => (
          <section className="print-section" key={section.id}>
            <div className="print-section-header">
              <h2 className={activeSectionId === section.id ? 'playing-section-title' : ''}>{section.name}</h2>
              {section.repeatCount > 1 && (
                <span>Repeat x{section.repeatCount}</span>
              )}
            </div>

            <div className="print-bar-lines">
              {chunkBars(section.bars).map((line, lineIndex) => (
                <div className="print-bar-grid" key={`${section.id}-${lineIndex}`}>
                  {line.map((bar) => (
                    <div className={`print-bar-cell${bar.id === activeBarId ? ' active-bar' : ''}`} key={bar.id}>
                      <span className="print-lyrics">{bar.lyrics ?? ''}</span>
                      <span
                        className={`print-chords print-chord-count-${getTokens(bar.chord).length}`}
                      >
                        {getTokens(bar.chord).map((chord, chordIndex) => (
                          <span
                            className={[
                              getTokens(bar.chord).length === 4 &&
                              (chordIndex === 1 || chordIndex === 3)
                                ? 'with-row-separator'
                                : '',
                              activeChord?.barId === bar.id && activeChord.chordIndex === chordIndex ? 'current-chord-text' : '',
                            ].filter(Boolean).join(' ')}
                            key={`${chord}-${chordIndex}`}
                          >
                            {chord}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  )
}

function chunkBars<T>(bars: T[]) {
  const chunks: T[][] = []

  for (let index = 0; index < bars.length; index += 4) {
    chunks.push(bars.slice(index, index + 4))
  }

  return chunks
}

function getChordTokens(chordText: string) {
  const tokens = chordText
    .trim()
    .split(/\s*\|\s*|\s+/)
    .filter(Boolean)
  return tokens.length > 0 ? tokens : ['%']
}
