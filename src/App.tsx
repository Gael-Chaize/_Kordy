import { useEffect, useRef, useState } from 'react'
import './App.css'
import {
  pianoSoundOptions,
  type PianoSound,
} from './audio/instruments'
import { playSong, previewChord, stopSong } from './audio/player'
import { normalizeBarChords } from './music/chords'
import {
  createGeneratedSong,
  defaultGeneratorAccidental,
  defaultGeneratorCadenceId,
  defaultGeneratorTonality,
  type Accidental,
} from './music/generator'
import type { Song } from './music/types'
import { GeneratorView } from './components/GeneratorView'
import { HelpView } from './components/HelpView'
import { PrintPreview } from './components/PrintPreview'
import { ProgressionView } from './components/ProgressionView'
import { useProgression } from './state/useProgression'

type ViewMode = 'edit' | 'preview' | 'generate' | 'help'

const emptyGeneratedSong: Song = {
  title: 'Generated chart',
  artist: 'Unknown artist',
  style: 'Pop',
  tempo: 120,
  sections: [],
}

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [isPlaying, setIsPlaying] = useState(false)
  const [drumsEnabled, setDrumsEnabled] = useState(true)
  const [bassEnabled, setBassEnabled] = useState(false)
  const [globalLoopEnabled, setGlobalLoopEnabled] = useState(false)
  const [pianoSound, setPianoSound] = useState<PianoSound>('dx7')
  const [generatedHistory, setGeneratedHistory] = useState({
    past: [] as Song[],
    present: emptyGeneratedSong,
  })
  const [generatorCadenceId, setGeneratorCadenceId] = useState(
    defaultGeneratorCadenceId,
  )
  const [generatorTonality, setGeneratorTonality] = useState(
    defaultGeneratorTonality,
  )
  const [generatorAccidental, setGeneratorAccidental] = useState<Accidental>(
    defaultGeneratorAccidental,
  )
  const [activeBarId, setActiveBarId] = useState<string | null>(null)
  const [activeChord, setActiveChord] = useState<{
    barId: string
    chordIndex: number | null
  } | null>(null)
  const {
    song,
    canUndo,
    undo,
    createNewSong,
    loadDemoSong,
    updateSongTitle,
    updateSongArtist,
    updateSongStyle,
    updateTempo,
    updateSectionName,
    updateSectionRepeatCount,
    duplicateSection,
    updateBarChord,
    normalizeBarChord,
    duplicateBars,
    addEmptyBarsAfter,
    deleteBars,
    moveBarLine,
    addSectionAfterLine,
    mergeSection,
    deleteSection,
  } = useProgression()
  const generatedSong = generatedHistory.present
  const activeSong = viewMode === 'generate' ? generatedSong : song
  const tempoRef = useRef(activeSong.tempo)
  const playbackIdRef = useRef(0)
  const lastPreviewRef = useRef<string | null>(null)

  useEffect(() => {
    tempoRef.current = activeSong.tempo
  }, [activeSong.tempo])

  function clearPlaybackState() {
    setIsPlaying(false)
    setActiveBarId(null)
    setActiveChord(null)
  }

  async function startPlayback(
    startBarId?: string,
    loopBarCount?: number,
    loopSectionId?: string,
  ) {
    playbackIdRef.current += 1
    const playbackId = playbackIdRef.current
    stopSong()
    setIsPlaying(true)
    setActiveBarId(null)
    setActiveChord(null)

    try {
      await playSong(activeSong, {
        drumsEnabled,
        bassEnabled,
        pianoSound,
        startBarId,
        loopBarCount,
        loopSectionId,
        onBarStart: setActiveBarId,
        onChordStart: (barId, chordIndex) =>
          setActiveChord({ barId, chordIndex }),
        getTempo: () => tempoRef.current,
      })
    } finally {
      if (playbackIdRef.current === playbackId) {
        clearPlaybackState()
      }
    }
  }

  function handleTransportClick() {
    if (isPlaying) {
      playbackIdRef.current += 1
      stopSong()
      clearPlaybackState()
      return
    }

    const totalBars = activeSong.sections.reduce(
      (count, section) => count + section.bars.length * section.repeatCount,
      0,
    )

    if (totalBars === 0) {
      return
    }

    void startPlayback(undefined, globalLoopEnabled ? totalBars : undefined)
  }

  function handlePlayLine(barId: string) {
    void startPlayback(barId)
  }

  function handleLoopLine(barId: string) {
    void startPlayback(barId, 4)
  }

  function handleLoopSection(sectionId: string) {
    void startPlayback(undefined, undefined, sectionId)
  }

  function handleStopLine() {
    playbackIdRef.current += 1
    stopSong()
    clearPlaybackState()
  }

  function handleNewSong() {
    stopSong()
    clearPlaybackState()

    if (viewMode === 'generate') {
      updateGeneratedSong(() => emptyGeneratedSong)
      return
    }

    createNewSong()
  }

  function handleDemoSong() {
    stopSong()
    clearPlaybackState()
    loadDemoSong()
  }

  function handleUndo() {
    stopSong()
    clearPlaybackState()

    if (viewMode === 'generate') {
      undoGeneratedSong()
      return
    }

    undo()
  }

  function updateGeneratedSong(updater: (currentSong: Song) => Song) {
    setGeneratedHistory((currentHistory) => {
      const nextSong = updater(currentHistory.present)

      if (nextSong === currentHistory.present) {
        return currentHistory
      }

      return {
        past: [...currentHistory.past.slice(-49), currentHistory.present],
        present: nextSong,
      }
    })
  }

  function undoGeneratedSong() {
    setGeneratedHistory((currentHistory) => {
      const previousSong = currentHistory.past.at(-1)

      if (!previousSong) {
        return currentHistory
      }

      return {
        past: currentHistory.past.slice(0, -1),
        present: previousSong,
      }
    })
  }

  function handleViewModeChange(nextViewMode: ViewMode) {
    stopSong()
    clearPlaybackState()
    setViewMode(nextViewMode)
  }

  function handleSongTitleChange(title: string) {
    if (viewMode === 'generate') {
      updateGeneratedSong((currentSong) => ({
        ...currentSong,
        title,
      }))
      return
    }

    updateSongTitle(title)
  }

  function handleSongArtistChange(artist: string) {
    if (viewMode === 'generate') {
      updateGeneratedSong((currentSong) => ({
        ...currentSong,
        artist,
      }))
      return
    }

    updateSongArtist(artist)
  }

  function handleSongStyleChange(style: string) {
    if (viewMode === 'generate') {
      updateGeneratedSong((currentSong) => ({
        ...currentSong,
        style,
      }))
      return
    }

    updateSongStyle(style)
  }

  function handleTempoChange(tempo: number) {
    if (Number.isNaN(tempo)) {
      return
    }

    if (viewMode === 'generate') {
      updateGeneratedSong((currentSong) => ({
        ...currentSong,
        tempo,
      }))
      return
    }

    updateTempo(tempo)
  }

  function handleInsertGeneratedSong() {
    updateGeneratedSong((currentSong) => ({
      ...createGeneratedSong(
        generatorCadenceId,
        generatorTonality,
        generatorAccidental,
        currentSong.tempo,
      ),
      artist: currentSong.artist,
      style: currentSong.style,
    }))
  }

  function handleApplyGeneratedExpansion(
    sectionId: string,
    afterBarId: string,
    insertedChords: string[],
  ) {
    stopSong()
    clearPlaybackState()
    updateGeneratedSong((currentSong) => ({
      ...currentSong,
      sections: currentSong.sections.map((section) => {
        if (section.id !== sectionId) {
          return section
        }

        const targetBarIndex = section.bars.findIndex(
          (bar) => bar.id === afterBarId,
        )

        if (targetBarIndex === -1) {
          return section
        }

        const targetBar = section.bars[targetBarIndex]
        const expandedChord = expandBarChordText(
          targetBar.chord,
          insertedChords,
        )

        if (expandedChord === targetBar.chord) {
          return section
        }

        return {
          ...section,
          bars: section.bars.map((bar) =>
            bar.id === targetBar.id ? { ...bar, chord: expandedChord } : bar,
          ),
        }
      }),
    }))
  }

  function handleBarChange(sectionId: string, barId: string, chord: string) {
    updateBarChord(sectionId, barId, chord)

    if (isPlaying) {
      return
    }

    const normalizedChord = normalizeBarChords(chord)

    if (!normalizedChord || lastPreviewRef.current === normalizedChord) {
      return
    }

    lastPreviewRef.current = normalizedChord
    void previewChord(normalizedChord, pianoSound)
  }

  return (
    <main className="app-shell">
      <header className="song-header">
        <div className="header-left">
          <div className="title-panel">
            <p className="eyebrow">Kordy</p>
            <div className="song-meta-row">
              <input
                aria-label="Song title"
                className={`song-title ${getSongTitleSize(activeSong.title)}`}
                value={activeSong.title}
                onChange={(event) => handleSongTitleChange(event.target.value)}
              />
            </div>
            <input
              aria-label="Artist"
              className="song-artist"
              value={activeSong.artist}
              onChange={(event) => handleSongArtistChange(event.target.value)}
            />
            <div className="title-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={handleNewSong}
              >
                New song
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={handleDemoSong}
              >
                Demo song
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  handleViewModeChange(viewMode === 'edit' ? 'preview' : 'edit')
                }
              >
                {viewMode === 'edit' ? 'Preview' : 'Back to edit'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => handleViewModeChange('generate')}
              >
                Generate
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  handleViewModeChange(viewMode === 'help' ? 'edit' : 'help')
                }
              >
                Help
              </button>
            </div>
          </div>
        </div>
        <div className="transport-stack">
          <div className="transport-panel">
            <label className="style-control">
              <span>Style</span>
              <input
                aria-label="Style"
                value={activeSong.style}
                onChange={(event) => handleSongStyleChange(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="undo-button"
              disabled={
                viewMode === 'generate'
                  ? generatedHistory.past.length === 0
                  : !canUndo
              }
              onClick={handleUndo}
            >
              Undo
            </button>
            <label className="tempo-control">
              <span>Tempo</span>
              <input
                type="number"
                min="30"
                max="260"
                value={activeSong.tempo}
                onChange={(event) => handleTempoChange(event.target.valueAsNumber)}
              />
            </label>
            <button
              type="button"
              className={`play-button${isPlaying ? ' playing' : ''}`}
              onClick={handleTransportClick}
            >
              {isPlaying ? 'Stop' : 'Play'}
            </button>
            <button
              type="button"
              className={`icon-toggle-button${
                globalLoopEnabled ? ' active' : ''
              }`}
              aria-label="Loop all"
              aria-pressed={globalLoopEnabled}
              onClick={() => setGlobalLoopEnabled((enabled) => !enabled)}
            >
              <span className="loop-icon" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`toggle-button${drumsEnabled ? ' active' : ''}`}
              aria-pressed={drumsEnabled}
              onClick={() => setDrumsEnabled((enabled) => !enabled)}
            >
              Drums
            </button>
            <button
              type="button"
              className={`toggle-button${bassEnabled ? ' active' : ''}`}
              aria-pressed={bassEnabled}
              onClick={() => setBassEnabled((enabled) => !enabled)}
            >
              Bass
            </button>
          </div>

          <label className="sound-control">
            <span>Piano sound</span>
            <select
              value={pianoSound}
              onChange={(event) =>
                setPianoSound(event.target.value as PianoSound)
              }
            >
              {pianoSoundOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {viewMode === 'edit' ? (
        <ProgressionView
          song={song}
          activeBarId={activeBarId}
          activeChord={activeChord}
          onSectionNameChange={updateSectionName}
          onSectionRepeatCountChange={updateSectionRepeatCount}
          onDuplicateSection={duplicateSection}
          onBarChange={handleBarChange}
          onBarBlur={normalizeBarChord}
          onDuplicateBars={duplicateBars}
          onAddEmptyBars={addEmptyBarsAfter}
          onDeleteBars={deleteBars}
          onMoveBarLine={moveBarLine}
          onAddSection={addSectionAfterLine}
          onMergeSection={mergeSection}
          onDeleteSection={deleteSection}
          onPlayLine={handlePlayLine}
          onLoopLine={handleLoopLine}
          onLoopSection={handleLoopSection}
          onStopLine={handleStopLine}
        />
      ) : viewMode === 'preview' ? (
        <PrintPreview song={song} />
      ) : viewMode === 'help' ? (
        <HelpView />
      ) : (
        <GeneratorView
          song={generatedSong.sections.length > 0 ? generatedSong : null}
          cadenceId={generatorCadenceId}
          tonality={generatorTonality}
          accidental={generatorAccidental}
          onCadenceChange={setGeneratorCadenceId}
          onTonalityChange={setGeneratorTonality}
          onAccidentalChange={setGeneratorAccidental}
          onInsert={handleInsertGeneratedSong}
          onApplyExpansion={handleApplyGeneratedExpansion}
        />
      )}
    </main>
  )
}

export default App

function expandBarChordText(chordText: string, insertedChords: string[]) {
  const tokens = getChordTokens(chordText)

  if (tokens.length === 0) {
    return chordText
  }

  const baseTokens = tokens.at(-1) === '%' ? tokens.slice(0, -1) : tokens
  const availableSlots = Math.max(0, 4 - baseTokens.length)

  if (insertedChords.length > availableSlots) {
    return chordText
  }

  const nextTokens = [...baseTokens]

  for (const insertedChord of insertedChords) {
    nextTokens.push(insertedChord)
  }

  if (nextTokens.length === baseTokens.length) {
    return chordText
  }

  if (nextTokens.length === 3) {
    nextTokens.push('%')
  }

  return nextTokens.join(' | ')
}

function getChordTokens(chordText: string) {
  return chordText
    .trim()
    .split(/\s*\|\s*|\s+/)
    .filter(Boolean)
}

function getSongTitleSize(title: string) {
  if (title.length > 56) {
    return 'very-long-title'
  }

  if (title.length > 40) {
    return 'long-title'
  }

  if (title.length > 28) {
    return 'medium-title'
  }

  return ''
}
