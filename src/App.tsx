import { useEffect, useRef, useState } from 'react'
import './App.css'
import {
  pianoSoundOptions,
  type PianoSound,
} from './audio/instruments'
import { playSong, previewChord, stopSong } from './audio/player'
import { normalizeBarChords } from './music/chords'
import { ProgressionView } from './components/ProgressionView'
import { useProgression } from './state/useProgression'

function App() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [drumsEnabled, setDrumsEnabled] = useState(true)
  const [bassEnabled, setBassEnabled] = useState(false)
  const [globalLoopEnabled, setGlobalLoopEnabled] = useState(false)
  const [pianoSound, setPianoSound] = useState<PianoSound>('dx7')
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
  const tempoRef = useRef(song.tempo)
  const playbackIdRef = useRef(0)
  const lastPreviewRef = useRef<string | null>(null)

  useEffect(() => {
    tempoRef.current = song.tempo
  }, [song.tempo])

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
      await playSong(song, {
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

    const totalBars = song.sections.reduce(
      (count, section) => count + section.bars.length * section.repeatCount,
      0,
    )
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
    undo()
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
        <div className="title-panel">
          <p className="eyebrow">Kordy</p>
          <input
            aria-label="Song title"
            className={`song-title ${getSongTitleSize(song.title)}`}
            value={song.title}
            onChange={(event) => updateSongTitle(event.target.value)}
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
          </div>
        </div>
        <div className="transport-stack">
          <div className="transport-panel">
            <button
              type="button"
              className="undo-button"
              disabled={!canUndo}
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
                value={song.tempo}
                onChange={(event) => updateTempo(event.target.valueAsNumber)}
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
    </main>
  )
}

export default App

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
