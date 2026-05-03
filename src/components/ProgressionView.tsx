import type { KeyboardEvent } from 'react'
import { isEmptyChord, parseBarChords } from '../music/chords'
import type { Song } from '../music/types'

type ProgressionViewProps = {
  song: Song
  activeBarId: string | null
  onSectionNameChange: (sectionId: string, name: string) => void
  onBarChange: (sectionId: string, barId: string, chord: string) => void
  onBarBlur: (sectionId: string, barId: string) => void
  onDuplicateBars: (sectionId: string, startIndex: number) => void
  onAddEmptyBars: (sectionId: string, startIndex: number) => void
  onDeleteBars: (sectionId: string, startIndex: number) => void
  onAddSection: (sectionId: string, startIndex: number) => void
  onRemoveSection: (sectionId: string) => void
}

export function ProgressionView({
  song,
  activeBarId,
  onSectionNameChange,
  onBarChange,
  onBarBlur,
  onDuplicateBars,
  onAddEmptyBars,
  onDeleteBars,
  onAddSection,
  onRemoveSection,
}: ProgressionViewProps) {
  const barValidity = getBarValidity(song)

  return (
    <div className="progression-view">
      {song.sections.map((section) => (
        <section className="chart-section" key={section.id}>
          <header className="section-header">
            <input
              aria-label="Section name"
              className="section-name"
              value={section.name}
              onChange={(event) =>
                onSectionNameChange(section.id, event.target.value)
              }
            />
            <button
              type="button"
              className="remove-section-button"
              onClick={() => onRemoveSection(section.id)}
            >
              Remove section
            </button>
          </header>

          <div className="bar-lines">
            {section.bars.length === 0 && (
              <div className="bar-line-actions empty-section-actions">
                <button
                  type="button"
                  onClick={() => onAddEmptyBars(section.id, -4)}
                >
                  Add empty bars
                </button>
                <button
                  type="button"
                  onClick={() => onAddSection(section.id, -4)}
                >
                  Add section
                </button>
              </div>
            )}

            {chunkBars(section.bars).map((line, lineIndex) => {
              const startIndex = lineIndex * 4
              const hasBarsAfterLine = startIndex + 4 < section.bars.length

              return (
                <div className="bar-line" key={`${section.id}-${startIndex}`}>
                  <div className="bar-grid">
                    {line.map((bar, index) => {
                      const barIndex = startIndex + index
                      const isInvalid =
                        !isEmptyChord(bar.chord) &&
                        !barValidity.get(bar.id)
                      const isActive = bar.id === activeBarId
                      const chordCount = getChordCount(bar.chord)

                      return (
                        <label
                          className={[
                            'bar-cell',
                            isInvalid ? 'invalid-bar' : '',
                            isActive ? 'active-bar' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          key={bar.id}
                        >
                          <span className="bar-number">{barIndex + 1}</span>
                          <input
                            aria-label={`${section.name} bar ${barIndex + 1}`}
                            aria-invalid={isInvalid}
                            className={`chord-count-${chordCount}`}
                            value={bar.chord}
                            placeholder="Chord"
                            onChange={(event) =>
                              onBarChange(
                                section.id,
                                bar.id,
                                event.target.value,
                              )
                            }
                            onKeyDown={(event) => handleBarKeyDown(event)}
                            onBlur={() => onBarBlur(section.id, bar.id)}
                          />
                        </label>
                      )
                    })}
                  </div>

                  <div className="bar-line-actions">
                    <button
                      type="button"
                      className="add-section-button"
                      onClick={() => onAddSection(section.id, startIndex)}
                    >
                      {hasBarsAfterLine ? 'Insert section' : 'Add section'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicateBars(section.id, startIndex)}
                    >
                      Duplicate bars
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddEmptyBars(section.id, startIndex)}
                    >
                      Add empty bars
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => onDeleteBars(section.id, startIndex)}
                    >
                      Delete bars
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function chunkBars<T>(bars: T[]) {
  const chunks: T[][] = []

  for (let index = 0; index < bars.length; index += 4) {
    chunks.push(bars.slice(index, index + 4))
  }

  return chunks
}

function getChordCount(chordText: string) {
  const count = chordText
    .trim()
    .split(/\s*\|\s*|\s+/)
    .filter(Boolean).length

  return Math.min(Math.max(count, 1), 4)
}

function handleBarKeyDown(event: KeyboardEvent<HTMLInputElement>) {
  const isCopyShortcut = (event.ctrlKey || event.metaKey) && event.key === 'c'
  const input = event.currentTarget
  const hasSelection = input.selectionStart !== input.selectionEnd

  if (!isCopyShortcut || hasSelection || input.value === '') {
    return
  }

  event.preventDefault()
  void navigator.clipboard.writeText(input.value)
}

function getBarValidity(song: Song) {
  const validity = new Map<string, boolean>()
  let previousChord: string | null = null

  song.sections.forEach((section) => {
    section.bars.forEach((bar) => {
      if (isEmptyChord(bar.chord)) {
        validity.set(bar.id, true)
        return
      }

      const parsedBar = parseBarChords(bar.chord, previousChord)
      validity.set(bar.id, parsedBar.valid)

      if (parsedBar.valid) {
        previousChord = parsedBar.lastResolvedChord
      }
    })
  })

  return validity
}
