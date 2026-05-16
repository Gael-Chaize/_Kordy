import { useState } from 'react'
import {
  suggestFreestyleExpansions,
  type ExpansionSuggestion,
} from '../music/expansions'
import {
  generatorCadences,
  generatorTonalities,
  type Accidental,
} from '../music/generator'
import type { Song } from '../music/types'

type GeneratorViewProps = {
  song: Song | null
  cadenceId: string
  tonality: string
  accidental: Accidental
  onCadenceChange: (cadenceId: string) => void
  onTonalityChange: (tonality: string) => void
  onAccidentalChange: (accidental: Accidental) => void
  onInsert: () => void
  onApplyExpansion: (
    sectionId: string,
    afterBarId: string,
    insertedChords: string[],
  ) => void
}

export function GeneratorView({
  song,
  cadenceId,
  tonality,
  accidental,
  onCadenceChange,
  onTonalityChange,
  onAccidentalChange,
  onInsert,
  onApplyExpansion,
}: GeneratorViewProps) {
  const [selectedBarId, setSelectedBarId] = useState<string | null>(null)
  const [isExpansionPanelOpen, setIsExpansionPanelOpen] = useState(false)
  const selectedTransition = song
    ? getSelectedTransition(song, selectedBarId)
    : null
  const suggestions = selectedTransition
    ? suggestFreestyleExpansions(
        selectedTransition.fromChord,
        selectedTransition.toChord,
        { availableSlots: selectedTransition.availableSlots },
      )
    : []

  return (
    <section className="generator-view" aria-label="Chord progression generator">
      <div className="generator-controls">
        <label className="generator-control">
          <span>Cadence:</span>
          <select
            value={cadenceId}
            onChange={(event) => onCadenceChange(event.target.value)}
          >
            {generatorCadences.map((cadence) => (
              <option value={cadence.id} key={cadence.id}>
                {cadence.label}
              </option>
            ))}
          </select>
        </label>

        <label className="generator-control">
          <span>Tonality:</span>
          <select
            value={tonality}
            onChange={(event) => onTonalityChange(event.target.value)}
          >
            {generatorTonalities.map((nextTonality) => (
              <option value={nextTonality} key={nextTonality}>
                {nextTonality}
              </option>
            ))}
          </select>
        </label>

        <label className="generator-control accidental-control">
          <span>Accidental:</span>
          <select
            value={accidental}
            onChange={(event) =>
              onAccidentalChange(event.target.value as Accidental)
            }
          >
            <option value="">rien</option>
            <option value="b">b</option>
            <option value="#">#</option>
          </select>
        </label>

        <button type="button" className="insert-button" onClick={onInsert}>
          Insert
        </button>
      </div>

      {song && (
        <div className="generated-chart" aria-label="Generated chord chart">
          {song.sections.map((section) => (
            <section className="generated-section" key={section.id}>
              <h2>{section.name}</h2>
              <div className="generated-grid">
                {section.bars.map((bar, index) => (
                  <button
                    type="button"
                    className={[
                      'generated-bar',
                      selectedBarId === bar.id ? 'selected-generated-bar' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    key={bar.id}
                    aria-pressed={selectedBarId === bar.id}
                    onClick={() => {
                      setSelectedBarId(bar.id)
                      setIsExpansionPanelOpen(false)
                    }}
                  >
                    <span className="generated-bar-number">{index + 1}</span>
                    <span>{bar.chord}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
          <button
            type="button"
            className="expand-button"
            disabled={!selectedTransition || suggestions.length === 0}
            onClick={() => setIsExpansionPanelOpen((isOpen) => !isOpen)}
          >
            Expand
          </button>
          {isExpansionPanelOpen && selectedTransition && (
            <ExpansionPanel
              suggestions={suggestions}
              onApply={(suggestion) => {
                onApplyExpansion(
                  selectedTransition.sectionId,
                  selectedTransition.fromBarId,
                  suggestion.insertedChords,
                )
                setIsExpansionPanelOpen(false)
              }}
            />
          )}
        </div>
      )}
    </section>
  )
}

function ExpansionPanel({
  suggestions,
  onApply,
}: {
  suggestions: ExpansionSuggestion[]
  onApply: (suggestion: ExpansionSuggestion) => void
}) {
  return (
    <div className="expansion-panel" aria-label="Transition suggestions">
      {suggestions.map((suggestion) => (
        <button
          type="button"
          className="expansion-suggestion"
          key={suggestion.id}
          onClick={() => onApply(suggestion)}
        >
          <span className="expansion-chords">
            {suggestion.insertedChords.join(' | ')}
          </span>
          <span className="expansion-label">{suggestion.label}</span>
          <span className="expansion-description">
            {suggestion.description}
          </span>
        </button>
      ))}
    </div>
  )
}

function getSelectedTransition(song: Song, selectedBarId: string | null) {
  if (!selectedBarId) {
    return null
  }

  for (const section of song.sections) {
    const fromBarIndex = section.bars.findIndex((bar) => bar.id === selectedBarId)
    const fromBar = section.bars[fromBarIndex]
    const toBar = section.bars[fromBarIndex + 1] ?? section.bars[0]

    if (!fromBar || !toBar || fromBar.id === toBar.id) {
      continue
    }

    const fromChord = getResolvedLastChordToken(section.bars, fromBarIndex)
    const nextChord = getFirstChordToken(toBar.chord)

    if (!fromChord || !nextChord) {
      return null
    }

    const toChord = nextChord === '%' ? fromChord : nextChord

    return {
      sectionId: section.id,
      fromBarId: fromBar.id,
      fromChord,
      toChord,
      availableSlots: getAvailableChordSlots(fromBar.chord),
    }
  }

  return null
}

function getResolvedLastChordToken(
  bars: Song['sections'][number]['bars'],
  selectedBarIndex: number,
) {
  for (let index = selectedBarIndex; index >= 0; index -= 1) {
    const chord = getLastDescribedChordToken(bars[index].chord)

    if (chord) {
      return chord
    }
  }

  return null
}

function getFirstChordToken(chordText: string) {
  return getChordTokens(chordText)[0] ?? null
}

function getLastDescribedChordToken(chordText: string) {
  const tokens = getChordTokens(chordText)

  return tokens.findLast((token) => token !== '%') ?? null
}

function getChordTokens(chordText: string) {
  return chordText
    .trim()
    .split(/\s*\|\s*|\s+/)
    .filter(Boolean)
}

function getAvailableChordSlots(chordText: string) {
  const tokens = getChordTokens(chordText)
  const baseTokens = tokens.at(-1) === '%' ? tokens.slice(0, -1) : tokens

  return Math.max(0, 4 - baseTokens.length)
}
