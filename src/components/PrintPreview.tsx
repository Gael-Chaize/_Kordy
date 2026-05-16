import type { Song } from '../music/types'

type PrintPreviewProps = {
  song: Song
}

export function PrintPreview({ song }: PrintPreviewProps) {
  return (
    <article className="print-preview" aria-label="Printable chord chart preview">
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
              <h2>{section.name}</h2>
              {section.repeatCount > 1 && (
                <span>Repeat x{section.repeatCount}</span>
              )}
            </div>

            <div className="print-bar-lines">
              {chunkBars(section.bars).map((line, lineIndex) => (
                <div className="print-bar-grid" key={`${section.id}-${lineIndex}`}>
                  {line.map((bar) => (
                    <div className="print-bar-cell" key={bar.id}>
                      <span className="print-chords">
                        {formatChordText(bar.chord)}
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

function formatChordText(chordText: string) {
  return chordText
    .trim()
    .split(/\s*\|\s*|\s+/)
    .filter(Boolean)
    .join(' | ')
}
