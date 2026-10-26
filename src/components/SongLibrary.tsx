import { useEffect, useRef } from 'react'
import type { SavedSong } from '../state/songStorage'

type Props = {
  songs: SavedSong[]
  activeSongId: string
  onLoad: (id: string) => void
  onClose: () => void
}

export function SongLibrary({ songs, activeSongId, onLoad, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current!
    dialog.showModal()
  }, [])

  return (
    <dialog ref={dialogRef} className="song-library" aria-labelledby="library-title" onClose={onClose}>
      <div className="library-heading">
        <h2 id="library-title">Load song</h2>
        <button type="button" className="secondary-button" onClick={onClose}>Close</button>
      </div>
      <p>Songs and current drafts are kept in this browser. Use Save song to save your changes.</p>
      <div className="library-list">
        {songs.map(entry => (
          <button key={entry.id} type="button" className="library-song" onClick={() => onLoad(entry.id)}>
            <strong>{entry.history.present.title || 'Untitled chart'}</strong>
            <span>{entry.history.present.artist || 'Unknown artist'}</span>
            <small>{entry.id === activeSongId ? 'Current song · ' : ''}{JSON.stringify(entry.history.present) !== JSON.stringify(entry.savedSong) ? 'Unsaved changes · ' : ''}{entry.history.present.style} · {entry.history.present.tempo} BPM</small>
          </button>
        ))}
      </div>
    </dialog>
  )
}
