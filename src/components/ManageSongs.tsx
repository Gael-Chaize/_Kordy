import { useRef, useState, type ChangeEvent } from 'react'
import type { Song } from '../music/types'
import type { SavedSong } from '../state/songStorage'
import { parseSongBundle, serializeSongBundle } from '../state/songBundles'

type Props = {
  songs: SavedSong[]
  activeSongId: string
  onImport: (songs: Song[]) => void
  onDelete: (ids: string[]) => void
}

export function ManageSongs({ songs, activeSongId, onImport, onDelete }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const chosen = songs.filter(entry => selected.has(entry.id))

  async function importFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (!files.length) return
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const imported = (await Promise.all(files.map(async file => {
        try { return parseSongBundle(await file.text()) } catch (error) {
          throw new Error(`${file.name}: ${error instanceof Error ? error.message : 'Import failed.'}`, { cause: error })
        }
      }))).flat()
      onImport(imported)
      setMessage(`${imported.length} song${imported.length === 1 ? '' : 's'} imported. Duplicate titles were renamed automatically.`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Import failed.')
    } finally { setBusy(false) }
  }

  function exportSongs() {
    if (!chosen.length) return
    const url = URL.createObjectURL(new Blob([serializeSongBundle(chosen)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `kordy-songs-${new Date().toISOString().slice(0, 10)}.json`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setError('')
    setMessage(`${chosen.length} song${chosen.length === 1 ? '' : 's'} exported in one bundle.`)
  }

  function deleteSongs() {
    if (!chosen.length || !window.confirm('Are you sure?')) return
    onDelete(chosen.map(entry => entry.id))
    setSelected(new Set())
    setError('')
    setMessage(`${chosen.length} song${chosen.length === 1 ? '' : 's'} deleted.`)
  }

  return (
    <section className="manage-songs" aria-labelledby="manage-songs-title">
      <h2 id="manage-songs-title">Manage songs</h2>
      <div className="manage-song-actions">
        <button type="button" className="secondary-button" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Importing…' : 'Import external songs'}
        </button>
        <button type="button" className="secondary-button" disabled={!chosen.length || busy} onClick={exportSongs}>
          Export selected songs
        </button>
        <button type="button" className="secondary-button delete-songs-button" disabled={!chosen.length || busy} onClick={deleteSongs}>
          Delete selected songs
        </button>
        <input ref={input} type="file" accept=".json,application/json" multiple hidden aria-label="Import song bundles" onChange={importFiles} />
      </div>
      <p className="manage-song-note">Export includes the current version of each song, including unsaved changes, lyrics and preview settings. Import adds songs to this browser without replacing existing songs.</p>
      <p className="manage-song-message" role="status">{message}</p>
      {error && <p className="manage-song-error" role="alert">{error}</p>}
      <div className="manage-song-selection">
        <label>
          <input type="checkbox" disabled={!songs.length} checked={chosen.length === songs.length && songs.length > 0}
            ref={element => { if (element) element.indeterminate = chosen.length > 0 && chosen.length < songs.length }}
            onChange={event => setSelected(event.target.checked ? new Set(songs.map(song => song.id)) : new Set())} />
          Select all
        </label>
        <span>{chosen.length} / {songs.length} selected</span>
      </div>
      <div className="manage-song-list">
        {songs.length === 0 && <p className="manage-song-note">No songs saved in this browser.</p>}
        {songs.map(entry => (
          <label className="manage-song-row" key={entry.id}>
            <input type="checkbox" checked={selected.has(entry.id)}
              aria-label={`Select ${entry.history.present.title || 'Untitled chart'}`}
              onChange={event => setSelected(current => {
                const next = new Set(current)
                if (event.target.checked) next.add(entry.id)
                else next.delete(entry.id)
                return next
              })} />
            <span className="manage-song-info">
              <strong>{entry.history.present.title || 'Untitled chart'}</strong>
              <span>{entry.history.present.artist || 'Unknown artist'}</span>
              <small>{entry.id === activeSongId ? 'Current song · ' : ''}{JSON.stringify(entry.history.present) !== JSON.stringify(entry.savedSong) ? 'Unsaved changes · ' : ''}{entry.history.present.style} · {entry.history.present.tempo} BPM</small>
            </span>
          </label>
        ))}
      </div>
    </section>
  )
}
