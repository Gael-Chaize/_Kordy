import type { Song } from '../music/types'

const STORAGE_KEY = 'kordy.song.v1'

export function loadStoredSong() {
  const storedSong = window.localStorage.getItem(STORAGE_KEY)

  if (!storedSong) {
    return null
  }

  try {
    const parsedSong: unknown = JSON.parse(storedSong)

    if (!isSong(parsedSong)) {
      return null
    }

    return parsedSong
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

function isSong(value: unknown): value is Song {
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
        Array.isArray(section.bars) &&
        section.bars.every(
          (bar) => typeof bar.id === 'string' && typeof bar.chord === 'string',
        ),
    )
  )
}
