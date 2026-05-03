import { useState } from 'react'
import './App.css'
import { playSong, stopSong } from './audio/player'
import { ProgressionView } from './components/ProgressionView'
import { useProgression } from './state/useProgression'

function App() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [drumsEnabled, setDrumsEnabled] = useState(true)
  const [activeBarId, setActiveBarId] = useState<string | null>(null)
  const {
    song,
    canUndo,
    undo,
    createNewSong,
    updateSongTitle,
    updateTempo,
    updateSectionName,
    updateBarChord,
    normalizeBarChord,
    duplicateBars,
    addEmptyBarsAfter,
    deleteBars,
    addSectionAfterLine,
    removeSection,
  } = useProgression()

  async function handleTransportClick() {
    if (isPlaying) {
      stopSong()
      setIsPlaying(false)
      setActiveBarId(null)
      return
    }

    setIsPlaying(true)

    try {
      await playSong(song, {
        drumsEnabled,
        onBarStart: setActiveBarId,
      })
    } finally {
      setIsPlaying(false)
      setActiveBarId(null)
    }
  }

  function handleNewSong() {
    stopSong()
    setIsPlaying(false)
    setActiveBarId(null)
    createNewSong()
  }

  function handleUndo() {
    stopSong()
    setIsPlaying(false)
    setActiveBarId(null)
    undo()
  }

  return (
    <main className="app-shell">
      <header className="song-header">
        <div className="title-panel">
          <p className="eyebrow">Kordy</p>
          <input
            aria-label="Song title"
            className="song-title"
            value={song.title}
            onChange={(event) => updateSongTitle(event.target.value)}
          />
          <button type="button" className="secondary-button" onClick={handleNewSong}>
            New song
          </button>
        </div>
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
            className={`toggle-button${drumsEnabled ? ' active' : ''}`}
            aria-pressed={drumsEnabled}
            onClick={() => setDrumsEnabled((enabled) => !enabled)}
          >
            Drums
          </button>
        </div>
      </header>

      <ProgressionView
        song={song}
        activeBarId={activeBarId}
        onSectionNameChange={updateSectionName}
        onBarChange={updateBarChord}
        onBarBlur={normalizeBarChord}
        onDuplicateBars={duplicateBars}
        onAddEmptyBars={addEmptyBarsAfter}
        onDeleteBars={deleteBars}
        onAddSection={addSectionAfterLine}
        onRemoveSection={removeSection}
      />
    </main>
  )
}

export default App
