import { useState, type DragEvent, type KeyboardEvent } from 'react'
import { isEmptyChord, parseBarChords } from '../music/chords'
import type { Song } from '../music/types'

type ProgressionViewProps = {
  song: Song
  activeBarId: string | null
  activeChord: { barId: string; chordIndex: number | null } | null
  onSectionNameChange: (sectionId: string, name: string) => void
  onSectionRepeatCountChange: (sectionId: string, repeatCount: number) => void
  onDuplicateSection: (sectionId: string) => void
  onBarChange: (sectionId: string, barId: string, chord: string) => void
  onBarBlur: (sectionId: string, barId: string) => void
  onDuplicateBars: (sectionId: string, startIndex: number) => void
  onAddEmptyBars: (sectionId: string, startIndex: number) => void
  onDeleteBars: (sectionId: string, startIndex: number) => void
  onMoveBarLine: (
    fromSectionId: string,
    fromStartIndex: number,
    toSectionId: string,
    toStartIndex: number,
  ) => void
  onAddSection: (sectionId: string, startIndex: number) => void
  onMergeSection: (sectionId: string) => void
  onDeleteSection: (sectionId: string) => void
  onPlayLine: (barId: string) => void
  onLoopLine: (barId: string) => void
  onLoopSection: (sectionId: string) => void
  onStopLine: () => void
}

export function ProgressionView({
  song,
  activeBarId,
  activeChord,
  onSectionNameChange,
  onSectionRepeatCountChange,
  onDuplicateSection,
  onBarChange,
  onBarBlur,
  onDuplicateBars,
  onAddEmptyBars,
  onDeleteBars,
  onMoveBarLine,
  onAddSection,
  onMergeSection,
  onDeleteSection,
  onPlayLine,
  onLoopLine,
  onLoopSection,
  onStopLine,
}: ProgressionViewProps) {
  const barValidity = getBarValidity(song)
  const [draggedLine, setDraggedLine] = useState<DraggedLine | null>(null)
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null)

  return (
    <div className="progression-view">
      {song.sections.map((section) => (
        <section className="chart-section" key={section.id}>
          <header className="section-header">
            <div className="section-title-row">
              <button
                type="button"
                className="section-loop-button"
                aria-label={`Loop section ${section.name}`}
                onClick={() => onLoopSection(section.id)}
              >
                <span className="loop-icon" aria-hidden="true" />
              </button>
              <input
                aria-label="Section name"
                className="section-name"
                value={section.name}
                onChange={(event) =>
                  onSectionNameChange(section.id, event.target.value)
                }
              />
            </div>
            <div className="section-controls">
              <label className="section-repeat-control">
                <span>Repeat x:</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={section.repeatCount}
                  onChange={(event) =>
                    onSectionRepeatCountChange(
                      section.id,
                      event.target.valueAsNumber,
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="section-action-button"
                onClick={() => onDuplicateSection(section.id)}
              >
                Duplicate section
              </button>
              <button
                type="button"
                className="section-delete-button"
                onClick={() => onDeleteSection(section.id)}
              >
                Delete section
              </button>
              <button
                type="button"
                className="section-merge-button"
                onClick={() => onMergeSection(section.id)}
              >
                Merge section
              </button>
            </div>
          </header>

          <div className="bar-lines">
            {section.bars.length === 0 && (
              <div
                className={[
                  'empty-section-drop-zone',
                  isDragTarget(dragTarget, section.id, 0, 'before')
                    ? 'drag-over-empty'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onDragOver={(event) =>
                  handleEmptySectionDragOver(event, section.id)
                }
                onDrop={(event) => handleEmptySectionDrop(event, section.id)}
              >
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
              </div>
            )}

            {chunkBars(section.bars).map((line, lineIndex) => {
              const startIndex = lineIndex * 4
              const hasBarsAfterLine = startIndex + 4 < section.bars.length

              return (
                <div
                  className={[
                    'bar-line',
                    isDragTarget(dragTarget, section.id, startIndex, 'before')
                      ? 'drag-over-before'
                      : '',
                    isDragTarget(dragTarget, section.id, startIndex, 'after')
                      ? 'drag-over-after'
                      : '',
                    isDraggedLine(draggedLine, section.id, startIndex)
                      ? 'dragging-line'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={`${section.id}-${startIndex}`}
                >
                  <div
                    className="bar-line-main"
                    onDragOver={(event) =>
                      handleLineDragOver(
                        event,
                        section.id,
                        startIndex,
                        line.length,
                      )
                    }
                    onDrop={(event) =>
                      handleLineDrop(event, section.id, startIndex, line.length)
                    }
                  >
                    <div className="bar-line-tools">
                      <button
                        type="button"
                        className="line-play-button"
                        aria-label={`Play from bar ${startIndex + 1}`}
                        onClick={() => onPlayLine(line[0].id)}
                      >
                        <span className="play-icon" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="line-tool-button"
                        aria-label={`Loop bar ${startIndex + 1} line`}
                        onClick={() => onLoopLine(line[0].id)}
                      >
                        <span className="loop-icon" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="line-tool-button"
                        aria-label="Stop playback"
                        onClick={onStopLine}
                      >
                        <span className="stop-icon" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="bar-grid">
                      {line.map((bar, index) => {
                        const barIndex = startIndex + index
                        const isInvalid =
                          !isEmptyChord(bar.chord) &&
                          !barValidity.get(bar.id)
                        const isActive = bar.id === activeBarId
                        const chordCount = getChordCount(bar.chord)
                        const activeChordIndex =
                          activeChord?.barId === bar.id
                            ? activeChord.chordIndex
                            : null

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
                            <span
                              className={`chord-color-overlay chord-count-${chordCount}`}
                              aria-hidden="true"
                            >
                              {getChordTokens(bar.chord).map(
                                (chord, chordIndex) => (
                                  <span key={`${chord}-${chordIndex}`}>
                                    {chordIndex > 0 ? ' | ' : ''}
                                    <span
                                      className={
                                        activeChordIndex === chordIndex
                                          ? 'current-chord-text'
                                          : ''
                                      }
                                    >
                                      {chord}
                                    </span>
                                  </span>
                                ),
                              )}
                            </span>
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

                    <button
                      type="button"
                      className="line-drag-handle"
                      aria-label={`Move bar line starting at bar ${startIndex + 1}`}
                      draggable
                      onDragStart={(event) =>
                        handleLineDragStart(event, section.id, startIndex)
                      }
                      onDragEnd={handleLineDragEnd}
                    >
                      <span className="drag-grip-icon" aria-hidden="true" />
                    </button>
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

  function handleLineDragStart(
    event: DragEvent<HTMLButtonElement>,
    sectionId: string,
    startIndex: number,
  ) {
    const nextDraggedLine = { sectionId, startIndex }

    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(
      'text/plain',
      `${nextDraggedLine.sectionId}:${nextDraggedLine.startIndex}`,
    )
    setDraggedLine(nextDraggedLine)
  }

  function handleLineDragEnd() {
    setDraggedLine(null)
    setDragTarget(null)
  }

  function handleLineDragOver(
    event: DragEvent<HTMLDivElement>,
    sectionId: string,
    startIndex: number,
    lineLength: number,
  ) {
    if (!draggedLine) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragTarget({
      sectionId,
      startIndex,
      position: getDropPosition(event, lineLength),
    })
  }

  function handleLineDrop(
    event: DragEvent<HTMLDivElement>,
    sectionId: string,
    startIndex: number,
    lineLength: number,
  ) {
    if (!draggedLine) {
      return
    }

    event.preventDefault()
    const position = getDropPosition(event, lineLength)
    const toStartIndex = position === 'before' ? startIndex : startIndex + lineLength

    onMoveBarLine(
      draggedLine.sectionId,
      draggedLine.startIndex,
      sectionId,
      toStartIndex,
    )
    setDraggedLine(null)
    setDragTarget(null)
  }

  function handleEmptySectionDragOver(
    event: DragEvent<HTMLDivElement>,
    sectionId: string,
  ) {
    if (!draggedLine) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragTarget({ sectionId, startIndex: 0, position: 'before' })
  }

  function handleEmptySectionDrop(
    event: DragEvent<HTMLDivElement>,
    sectionId: string,
  ) {
    if (!draggedLine) {
      return
    }

    event.preventDefault()
    onMoveBarLine(draggedLine.sectionId, draggedLine.startIndex, sectionId, 0)
    setDraggedLine(null)
    setDragTarget(null)
  }
}

type DraggedLine = {
  sectionId: string
  startIndex: number
}

type DragTarget = DraggedLine & {
  position: 'before' | 'after'
}

function getDropPosition(event: DragEvent<HTMLDivElement>, lineLength: number) {
  const bounds = event.currentTarget.getBoundingClientRect()
  const pointerOffset = event.clientY - bounds.top
  const position = pointerOffset < bounds.height / 2 ? 'before' : 'after'

  if (lineLength === 0) {
    return 'before'
  }

  return position
}

function isDraggedLine(
  draggedLine: DraggedLine | null,
  sectionId: string,
  startIndex: number,
) {
  return (
    draggedLine?.sectionId === sectionId && draggedLine.startIndex === startIndex
  )
}

function isDragTarget(
  dragTarget: DragTarget | null,
  sectionId: string,
  startIndex: number,
  position: DragTarget['position'],
) {
  return (
    dragTarget?.sectionId === sectionId &&
    dragTarget.startIndex === startIndex &&
    dragTarget.position === position
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
  const count = getChordTokens(chordText).length

  return Math.min(Math.max(count, 1), 4)
}

function getChordTokens(chordText: string) {
  return chordText
    .trim()
    .split(/\s*\|\s*|\s+/)
    .filter(Boolean)
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
