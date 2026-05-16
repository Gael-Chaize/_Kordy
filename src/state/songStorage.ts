import type { Song } from '../music/types'

const STORAGE_KEY = 'kordy.song.v1'

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
    (song.artist === undefined || typeof song.artist === 'string') &&
    (song.style === undefined || typeof song.style === 'string') &&
    typeof song.tempo === 'number' &&
    Array.isArray(song.sections) &&
    song.sections.every(
      (section) =>
        typeof section.id === 'string' &&
        typeof section.name === 'string' &&
        (section.repeatCount === undefined ||
          typeof section.repeatCount === 'number') &&
        Array.isArray(section.bars) &&
        section.bars.every(
          (bar) => typeof bar.id === 'string' && typeof bar.chord === 'string',
        ),
    )
  )
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
