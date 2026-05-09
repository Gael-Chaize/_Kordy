import type { Song } from '../music/types'

const STORAGE_KEY = 'kordy.song.v1'

export function loadStoredSong() {
  const storedSong = window.localStorage.getItem(STORAGE_KEY)

  if (!storedSong) {
    return null
  }

  try {
    const parsedSong: unknown = JSON.parse(storedSong)

    if (!isSongLike(parsedSong)) {
      return null
    }

    return normalizeSong(parsedSong)
  } catch {
    return null
  }
}

export function saveStoredSong(song: Song) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(song))
}

export function clearStoredSong() {
  window.localStorage.removeItem(STORAGE_KEY)
}

type StoredSong = Omit<Song, 'sections'> & {
  sections: Array<Omit<Song['sections'][number], 'repeatCount'> & {
    repeatCount?: number
  }>
}

function isSongLike(value: unknown): value is StoredSong {
  if (!value || typeof value !== 'object') {
    return false
  }

  const song = value as Song

  return (
    typeof song.title === 'string' &&
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
