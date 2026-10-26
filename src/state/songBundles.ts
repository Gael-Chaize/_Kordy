import type { Song } from '../music/types'
import { createSavedSong, readSongDocument, type SavedSong } from './songStorage'

type SongBundle = {
  format: 'kordy-song-bundle'
  version: 1
  exportedAt: string
  songs: Song[]
}

export function serializeSongBundle(entries: SavedSong[]): string {
  const bundle: SongBundle = {
    format: 'kordy-song-bundle',
    version: 1,
    exportedAt: new Date().toISOString(),
    // Transfer the current work, including drafts and all per-song settings.
    songs: entries.map(entry => entry.history.present),
  }
  return JSON.stringify(bundle, null, 2)
}

export function parseSongBundle(text: string): Song[] {
  let value: unknown
  try { value = JSON.parse(text.replace(/^\uFEFF/, '')) } catch {
    throw new Error('This file is not valid JSON.')
  }
  if (!value || typeof value !== 'object') throw new Error('This is not a Kordy song bundle.')
  const bundle = value as Partial<SongBundle>
  if (bundle.format !== 'kordy-song-bundle') throw new Error('This is not a Kordy song bundle.')
  if (bundle.version !== 1) throw new Error('This bundle version is not supported.')
  if (!Array.isArray(bundle.songs) || bundle.songs.length === 0) throw new Error('This bundle contains no songs.')
  return bundle.songs.map((song, index) => {
    try { return readSongDocument(song) } catch (error) {
      throw new Error(`Song ${index + 1}: ${error instanceof Error ? error.message : 'Invalid song data.'}`, { cause: error })
    }
  })
}

export function uniqueImportedTitle(title: string, usedTitles: Set<string>): string {
  if (!usedTitles.has(title)) return title
  const suffix = /^(.*)_duplicate_(\d+)$/.exec(title)
  const base = suffix ? suffix[1] : title
  let number = suffix ? BigInt(suffix[2]) + 1n : 1n
  let candidate: string
  do {
    candidate = `${base}_duplicate_${String(number).padStart(2, '0')}`
    number++
  } while (usedTitles.has(candidate))
  return candidate
}

export function appendImportedSongs(existing: SavedSong[], songs: Song[]): SavedSong[] {
  const titles = new Set(existing.map(entry => entry.history.present.title))
  const imported = songs.map(song => {
    const title = uniqueImportedTitle(song.title, titles)
    titles.add(title)
    return createSavedSong({ ...song, title })
  })
  return [...existing, ...imported]
}
