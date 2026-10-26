import type { Song } from '../music/types'
import { createId } from '../music/createId'
import { demoSong } from './demoSong'
import { previewFontSizes } from '../music/previewSettings'

const STORAGE_KEY = 'kordy.song.v1'
const LIBRARY_KEY = 'kordy.library.v1'

// Versioned, JSON-compatible documents can later be exported independently.
export type SavedSong = {
  id: string
  updatedAt: string
  history: SongHistory
  savedSong: Song | null
}

export type SongLibrary = {
  version: 1
  activeSongId: string
  songs: SavedSong[]
}

export function createSavedSong(song: Song): SavedSong {
  return {
    id: createId(),
    updatedAt: new Date().toISOString(),
    history: { past: [], present: song },
    savedSong: song,
  }
}

export function loadSongLibrary(): SongLibrary {
  try {
    const raw = window.localStorage.getItem(LIBRARY_KEY)
    if (raw) {
      const value = JSON.parse(raw) as SongLibrary
      if (value.version === 1 && Array.isArray(value.songs) && value.songs.length > 0 &&
        value.songs.every(entry => typeof entry.id === 'string' &&
          typeof entry.updatedAt === 'string' && isSongHistoryLike(entry.history))) {
        return {
          version: 1,
          activeSongId: value.songs.some(entry => entry.id === value.activeSongId)
            ? value.activeSongId : value.songs[0].id,
          songs: value.songs.map(entry => ({
            ...entry,
            history: normalizeHistory(entry.history),
            savedSong: entry.savedSong === null ? null
              : isSongLike(entry.savedSong) ? normalizeSong(entry.savedSong)
              : normalizeSong(entry.history.present),
          })),
        }
      }
    }
  } catch { /* Recover the previous editor document when available. */ }

  const firstSong = { ...createSavedSong(demoSong), id: 'song-for-my-father' }
  const previousHistory = loadStoredHistory()
  const recoveredSong = previousHistory
    ? { ...createSavedSong(previousHistory.present), history: previousHistory }
    : null
  return {
    version: 1,
    activeSongId: recoveredSong?.id ?? firstSong.id,
    songs: recoveredSong ? [firstSong, recoveredSong] : [firstSong],
  }
}

export function saveSongLibrary(library: SongLibrary) {
  window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(library))
}

export type SongHistory = {
  past: Song[]
  present: Song
}

export function loadStoredHistory() {
  const storedValue = window.localStorage.getItem(STORAGE_KEY)

  if (!storedValue) {
    return null
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue)

    if (isSongHistoryLike(parsedValue)) {
      return normalizeHistory(parsedValue)
    }

    if (isSongLike(parsedValue)) {
      return {
        past: [],
        present: normalizeSong(parsedValue),
      }
    }

    return null
  } catch {
    return null
  }
}

export function loadStoredSong() {
  return loadStoredHistory()?.present ?? null
}

export function saveStoredHistory(history: SongHistory) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
}

export function saveStoredSong(song: Song) {
  saveStoredHistory({
    past: [],
    present: song,
  })
}

export function clearStoredSong() {
  window.localStorage.removeItem(STORAGE_KEY)
}

type StoredSong = Omit<Song, 'sections'> & {
  sections: Array<Omit<Song['sections'][number], 'repeatCount'> & {
    repeatCount?: number
  }>
}

type StoredSongHistory = {
  past: StoredSong[]
  present: StoredSong
}

function isSongHistoryLike(value: unknown): value is StoredSongHistory {
  if (!value || typeof value !== 'object') {
    return false
  }

  const history = value as SongHistory

  return (
    Array.isArray(history.past) &&
    history.past.every(isSongLike) &&
    isSongLike(history.present)
  )
}

function normalizeHistory(history: StoredSongHistory): SongHistory {
  return {
    past: history.past.map(normalizeSong),
    present: normalizeSong(history.present),
  }
}

function isSongLike(value: unknown): value is StoredSong {
  if (!value || typeof value !== 'object') {
    return false
  }

  const song = value as Song

  return (
    typeof song.title === 'string' &&
    (song.gridColor === undefined || (typeof song.gridColor === 'string' && /^#[0-9a-f]{6}$/i.test(song.gridColor))) &&
    (song.chordColor === undefined || (typeof song.chordColor === 'string' && /^#[0-9a-f]{6}$/i.test(song.chordColor))) &&
    (song.chordBold === undefined || typeof song.chordBold === 'boolean') &&
    (song.lyricsBold === undefined || typeof song.lyricsBold === 'boolean') &&
    (song.chordFontSize === undefined || previewFontSizes.includes(song.chordFontSize)) &&
    (song.lyricsFontSize === undefined || previewFontSizes.includes(song.lyricsFontSize)) &&
    (song.sectionFontSize === undefined || previewFontSizes.includes(song.sectionFontSize)) &&
    (song.headerFontSize === undefined || previewFontSizes.includes(song.headerFontSize)) &&
    (song.transpose === undefined || (Number.isInteger(song.transpose) && Math.abs(song.transpose) <= 13)) &&
    (song.artist === undefined || typeof song.artist === 'string') &&
    (song.style === undefined || typeof song.style === 'string') &&
    typeof song.tempo === 'number' && Number.isFinite(song.tempo) && song.tempo > 0 &&
    Array.isArray(song.sections) &&
    song.sections.every(
      (section) =>
        section !== null && typeof section === 'object' &&
        typeof section.id === 'string' &&
        typeof section.name === 'string' &&
        (section.playbackSectionId === undefined || typeof section.playbackSectionId === 'string') &&
        (section.repeatCount === undefined ||
          (Number.isInteger(section.repeatCount) && section.repeatCount >= 1)) &&
        Array.isArray(section.bars) &&
        section.bars.every(
          (bar) => bar !== null && typeof bar === 'object' && typeof bar.id === 'string' && typeof bar.chord === 'string' &&
            (bar.lyrics === undefined || typeof bar.lyrics === 'string'),
        ),
    )
  )
}

export function readSongDocument(value: unknown): Song {
  if (!isSongLike(value)) throw new Error('Invalid song data.')
  const normalized = normalizeSong(value)
  const sectionIds = normalized.sections.map(section => section.id)
  const barIds = normalized.sections.flatMap(section => section.bars.map(bar => bar.id))
  if (new Set(sectionIds).size !== sectionIds.length || new Set(barIds).size !== barIds.length) {
    throw new Error('A song contains duplicate section or bar identifiers.')
  }
  return normalized
}

function normalizeSong(song: StoredSong): Song {
  return {
    ...song,
    artist: typeof song.artist === 'string' ? song.artist : 'Unknown artist',
    style: typeof song.style === 'string' ? song.style : 'Pop',
    sections: song.sections.map((section) => {
      const repeatCount = section.repeatCount

      return {
        ...section,
        repeatCount:
          repeatCount !== undefined &&
          Number.isInteger(repeatCount) &&
          repeatCount >= 1
            ? repeatCount
            : 1,
      }
    }),
  }
}
