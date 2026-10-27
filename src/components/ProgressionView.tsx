import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { isEmptyChord, parseBarChords } from '../music/chords'
import type { Song } from '../music/types'
import { canReferenceSection } from '../music/playbackSections'

type ProgressionViewProps = {
  song: Song
  activeBarId: string | null
  activeSectionId: string | null
  activeChord: { barId: string; chordIndex: number | null } | null
  onSectionNameChange: (sectionId: string, name: string) => void
  onSectionPlaybackChange: (sectionId: string, targetId: string) => void
  onSectionRepeatCountChange: (sectionId: string, repeatCount: number) => void
  onDuplicateSection: (sectionId: string) => void
  onBarChange: (sectionId: string, barId: string, chord: string) => void
  onLyricsChange: (sectionId: string, barId: string, lyrics: string) => void
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
  onMoveSection: (fromId: string, toId: string, position: 'before' | 'after') => void
  onDeleteSection: (sectionId: string) => void
  onPlayLine: (barId: string) => void
  onLoopLine: (barId: string) => void
  onLoopSection: (sectionId: string) => void
  onStopLine: () => void
}

export function ProgressionView({
  song,
  activeBarId,
  activeSectionId,
  activeChord,
  onSectionNameChange,
  onSectionPlaybackChange,
  onSectionRepeatCountChange,
  onDuplicateSection,
  onBarChange,
  onLyricsChange,
  onBarBlur,
  onDuplicateBars,
  onAddEmptyBars,
  onDeleteBars,
  onMoveBarLine,
  onAddSection,
  onMergeSection,
  onMoveSection,
  onDeleteSection,
  onPlayLine,
  onLoopLine,
  onLoopSection,
  onStopLine,
}: ProgressionViewProps) {
  const barValidity = getBarValidity(song)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => new Set())
  const [draggedLine, setDraggedLine] = useState<DraggedLine | null>(null)
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null)
  const [draggedSection, setDraggedSection] = useState<string | null>(null)
  const [sectionTarget, setSectionTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null)
  const touchTarget = useRef<typeof sectionTarget>(null)

  function targetSection(element: HTMLElement, y: number) {
    const id = element.dataset.sectionId!
    const bounds = element.getBoundingClientRect()
    return { id, position: y < bounds.top + bounds.height / 2 ? 'before' as const : 'after' as const }
  }

  function clearSectionDrag() {
    setDraggedSection(null)
    setSectionTarget(null)
    touchTarget.current = null
  }

  return (
    <div className="progression-view">
      {song.sections.map((section) => (
        <section
          className={['chart-section', draggedSection === section.id ? 'dragging-section' : '',
            sectionTarget?.id === section.id ? `section-drop-${sectionTarget.position}` : ''].filter(Boolean).join(' ')}
          key={section.id}
          data-section-id={section.id}
          onDragOver={event => {
            if (!draggedSection || draggedSection === section.id) return
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
            setSectionTarget(targetSection(event.currentTarget, event.clientY))
          }}
          onDrop={event => {
            if (!draggedSection) return
            event.preventDefault()
            const target = targetSection(event.currentTarget, event.clientY)
            onMoveSection(draggedSection, target.id, target.position)
            clearSectionDrag()
          }}
        >
          <header className="section-header">
            <div className="section-title-row">
              <button
                type="button"
                className="section-drag-handle"
                aria-label={`Move section ${section.name}`}
                title="Drag to move section · Arrow keys to move up or down"
                draggable
                onDragStart={event => {
                  setDraggedLine(null)
                  setDragTarget(null)
                  setDraggedSection(section.id)
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', section.id)
                }}
                onDragEnd={clearSectionDrag}
                onPointerDown={event => {
                  if (event.pointerType !== 'touch') return
                  event.currentTarget.setPointerCapture(event.pointerId)
                  setDraggedSection(section.id)
                }}
                onPointerMove={event => {
                  if (event.pointerType !== 'touch' || !event.currentTarget.hasPointerCapture(event.pointerId)) return
                  const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-section-id]')
                  const target = element && element.dataset.sectionId !== section.id ? targetSection(element, event.clientY) : null
                  touchTarget.current = target
                  setSectionTarget(target)
                  if (event.clientY < 60) window.scrollBy(0, -20)
                  else if (event.clientY > window.innerHeight - 60) window.scrollBy(0, 20)
                }}
                onPointerUp={event => {
                  if (event.pointerType !== 'touch') return
                  const target = touchTarget.current
                  if (target) onMoveSection(section.id, target.id, target.position)
                  clearSectionDrag()
                }}
                onPointerCancel={event => {
                  if (event.pointerType === 'touch') clearSectionDrag()
                }}
                onKeyDown={event => {
                  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
                  event.preventDefault()
                  const index = song.sections.findIndex(item => item.id === section.id)
                  const neighbor = song.sections[index + (event.key === 'ArrowUp' ? -1 : 1)]
                  if (neighbor) onMoveSection(section.id, neighbor.id, event.key === 'ArrowUp' ? 'before' : 'after')
                }}
              ><span className="drag-grip-icon" aria-hidden="true" /></button>
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
                className={`section-name${activeSectionId === section.id ? ' playing-section-title' : ''}`}
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

          <button
            type="button"
            className="section-collapse-button"
            aria-label={`${collapsedSections.has(section.id) ? 'Expand' : 'Collapse'} section ${section.name}`}
            aria-expanded={!collapsedSections.has(section.id)}
            aria-controls={`section-bars-${section.id}`}
            onClick={() => setCollapsedSections(current => {
              const next = new Set(current)
              if (next.has(section.id)) next.delete(section.id)
              else next.add(section.id)
              return next
            })}
          ><span className="section-chevron" aria-hidden="true" /></button>

          <div className="bar-lines" id={`section-bars-${section.id}`} hidden={collapsedSections.has(section.id)}>
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
                <label className="section-playback-control">
                  <span>Play</span>
                  <select
                    aria-label={`Playback for section ${section.name}`}
                    value={song.sections.some(item => item.id === section.playbackSectionId) ? section.playbackSectionId ?? '' : ''}
                    onChange={event => onSectionPlaybackChange(section.id, event.target.value)}
                  >
                    <option value="">Silence</option>
                    {song.sections.filter(item => item.id !== section.id).map(item => (
                      <option key={item.id} value={item.id} disabled={!canReferenceSection(song, section.id, item.id)}>
                        {item.name || 'Untitled section'}
                      </option>
                    ))}
                  </select>
                </label>
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
                        hasBarsAfterLine,
                      )
                    }
                    onDrop={(event) =>
                      handleLineDrop(
                        event,
                        section.id,
                        startIndex,
                        line.length,
                        hasBarsAfterLine,
                      )
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
                          <div
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
                              className="bar-lyrics"
                              aria-label={`${section.name} bar ${barIndex + 1} lyrics`}
                              value={bar.lyrics ?? ''}
                              placeholder="Lyrics"
                              onChange={event => onLyricsChange(section.id, bar.id, event.target.value)}
                            />
                            <div className="bar-chord-area">
                            <span
                              className={`chord-color-overlay chord-count-${chordCount}`}
                              aria-hidden="true"
                            >
                              {getChordTokens(bar.chord).map(
                                (chord, chordIndex) => (
                                  <span
                                    className={
                                      activeChordIndex === chordIndex
                                        ? 'current-chord-text'
                                        : ''
                                    }
                                    key={`${chord}-${chordIndex}`}
                                  >
                                    {chord}
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
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                                  event.preventDefault()
                                  onBarBlur(section.id, bar.id)
                                } else {
                                  handleBarKeyDown(event)
                                }
                              }}
                              onBlur={() => onBarBlur(section.id, bar.id)}
                            />
                            </div>
                          </div>
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
    hasBarsAfterLine: boolean,
  ) {
    if (!draggedLine) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragTarget(
      getLineDropTarget(
        event,
        sectionId,
        startIndex,
        lineLength,
        hasBarsAfterLine,
      ),
    )
  }

  function handleLineDrop(
    event: DragEvent<HTMLDivElement>,
    sectionId: string,
    startIndex: number,
    lineLength: number,
    hasBarsAfterLine: boolean,
  ) {
    if (!draggedLine) {
      return
    }

    event.preventDefault()
    const dropTarget = getLineDropTarget(
      event,
      sectionId,
      startIndex,
      lineLength,
      hasBarsAfterLine,
    )
    const toStartIndex =
      dropTarget.position === 'before'
        ? dropTarget.startIndex
        : dropTarget.startIndex + lineLength

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

function getLineDropTarget(
  event: DragEvent<HTMLDivElement>,
  sectionId: string,
  startIndex: number,
  lineLength: number,
  hasBarsAfterLine: boolean,
): DragTarget {
  const bounds = event.currentTarget.getBoundingClientRect()
  const pointerOffset = event.clientY - bounds.top
  const position = pointerOffset < bounds.height / 2 ? 'before' : 'after'

  if (position === 'after' && hasBarsAfterLine) {
    return {
      sectionId,
      startIndex: startIndex + lineLength,
      position: 'before',
    }
  }

  return {
    sectionId,
    startIndex,
    position,
  }
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
