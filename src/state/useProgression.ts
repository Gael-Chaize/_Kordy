import { useEffect, useState } from 'react'
import { createId } from '../music/createId'
import { normalizeBarChords, parseBarChords } from '../music/chords'
import type { Song } from '../music/types'
import { appendImportedSongs } from './songBundles'
import { canReferenceSection } from '../music/playbackSections'
import { previewFontSizes, previewFontDefaults, defaultChordColor, defaultGridColor, type PreviewFontField } from '../music/previewSettings'
import {
  createSavedSong,
  loadSongLibrary,
  saveSongLibrary,
  type SongHistory,
} from './songStorage'

const initialSong: Song = {
  title: 'Untitled chart',
  artist: 'Unknown artist',
  style: 'Pop',
  tempo: 120,
  sections: [
    {
      id: 'intro',
      name: 'Intro',
      repeatCount: 1,
      bars: [
        { id: 'intro-1', chord: '' },
        { id: 'intro-2', chord: '' },
        { id: 'intro-3', chord: '' },
        { id: 'intro-4', chord: '' },
      ],
    },
  ],
}

export function useProgression() {
  const [library, setLibrary] = useState(loadSongLibrary)
  const [storageError, setStorageError] = useState(false)
  const activeEntry = library.songs.find(entry => entry.id === library.activeSongId)!
  const history = activeEntry.history
  const isDirty = JSON.stringify(history.present) !== JSON.stringify(activeEntry.savedSong)

  function setHistory(updater: (current: SongHistory) => SongHistory) {
    setLibrary(current => ({
      ...current,
      songs: current.songs.map(entry => {
        if (entry.id !== current.activeSongId) return entry
        const nextHistory = updater(entry.history)
        return nextHistory === entry.history ? entry : {
          ...entry, history: nextHistory, updatedAt: new Date().toISOString(),
        }
      }),
    }))
  }

  const song = history.present

  useEffect(() => {
    let failed = false
    try { saveSongLibrary(library) } catch { failed = true }
    const notification = window.setTimeout(() => setStorageError(failed), 0)
    return () => window.clearTimeout(notification)
  }, [library])

  function updateSong(updater: (currentSong: Song) => Song) {
    setHistory((currentHistory) => {
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

  function undo() {
    setHistory((currentHistory) => {
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

  function createNewSong() {
    const entry = { ...createSavedSong(initialSong), savedSong: null }
    setLibrary(current => ({
      ...current, activeSongId: entry.id, songs: [...current.songs, entry],
    }))
  }

  function loadSong(id: string) {
    setLibrary(current => current.songs.some(entry => entry.id === id)
      ? { ...current, activeSongId: id } : current)
  }

  function saveSong() {
    setLibrary(current => ({
      ...current,
      songs: current.songs.map(entry => entry.id === current.activeSongId
        ? { ...entry, savedSong: entry.history.present, updatedAt: new Date().toISOString() }
        : entry),
    }))
  }

  function saveSongCopy(song: Song) {
    const entry = createSavedSong(song)
    setLibrary(current => ({
      ...current, activeSongId: entry.id, songs: [...current.songs, entry],
    }))
  }

  function importSongs(songs: Song[]) {
    setLibrary(current => ({ ...current, songs: appendImportedSongs(current.songs, songs) }))
  }

  function updateSongTitle(title: string) {
    updateSong((currentSong) => ({
      ...currentSong,
      title,
    }))
  }

  function updateTranspose(transpose: number) {
    if (!Number.isInteger(transpose) || Math.abs(transpose) > 13) return
    updateSong(current => (current.transpose ?? 0) === transpose ? current : { ...current, transpose })
  }

  function updatePreviewFontSize(field: PreviewFontField, size: number) {
    if (!previewFontSizes.includes(size)) return
    updateSong(current => (current[field] ?? previewFontDefaults[field]) === size ? current : { ...current, [field]: size })
  }

  function updatePreviewBold(field: 'chordBold' | 'lyricsBold', bold: boolean) {
    updateSong(current => (current[field] ?? true) === bold ? current : { ...current, [field]: bold })
  }

  function updateChordColor(color: string) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return
    updateSong(current => (current.chordColor ?? defaultChordColor) === color ? current : { ...current, chordColor: color })
  }

  function updateGridColor(color: string) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return
    updateSong(current => (current.gridColor ?? defaultGridColor) === color ? current : { ...current, gridColor: color })
  }

  function updateSongArtist(artist: string) {
    updateSong((currentSong) => ({
      ...currentSong,
      artist,
    }))
  }

  function updateSongStyle(style: string) {
    updateSong((currentSong) => ({
      ...currentSong,
      style,
    }))
  }

  function updateTempo(tempo: number) {
    if (Number.isNaN(tempo)) {
      return
    }

    updateSong((currentSong) => ({
      ...currentSong,
      tempo,
    }))
  }

  function updateSectionName(sectionId: string, name: string) {
    updateSong((currentSong) => ({
      ...currentSong,
      sections: currentSong.sections.map((section) =>
        section.id === sectionId ? { ...section, name } : section,
      ),
    }))
  }

  function updateSectionPlayback(sectionId: string, targetId: string) {
    updateSong(current => {
      if (targetId && !canReferenceSection(current, sectionId, targetId)) return current
      return { ...current, sections: current.sections.map(section => section.id === sectionId
        ? { ...section, playbackSectionId: targetId || undefined } : section) }
    })
  }

  function updateSectionRepeatCount(sectionId: string, repeatCount: number) {
    if (!Number.isInteger(repeatCount) || repeatCount < 1) {
      return
    }

    updateSong((currentSong) => ({
      ...currentSong,
      sections: currentSong.sections.map((section) =>
        section.id === sectionId ? { ...section, repeatCount } : section,
      ),
    }))
  }

  function updateBarChord(sectionId: string, barId: string, chord: string) {
    updateBar(sectionId, barId, chord)
  }

  function updateBarLyrics(sectionId: string, barId: string, lyrics: string) {
    updateSong(currentSong => ({
      ...currentSong,
      sections: currentSong.sections.map(section => section.id === sectionId ? {
        ...section,
        bars: section.bars.map(bar => bar.id === barId ? { ...bar, lyrics } : bar),
      } : section),
    }))
  }

  function normalizeBarChord(sectionId: string, barId: string) {
    updateSong((currentSong) => {
      const section = currentSong.sections.find(
        (currentSection) => currentSection.id === sectionId,
      )
      const bar = section?.bars.find((currentBar) => currentBar.id === barId)

      if (!bar) {
        return currentSong
      }

      const normalizedChord = normalizeBarChords(
        bar.chord,
        getPreviousResolvedChord(currentSong, barId),
      )

      if (!normalizedChord) {
        return currentSong
      }

      return updateBarInSong(currentSong, sectionId, barId, normalizedChord)
    })
  }

  function updateBar(sectionId: string, barId: string, chord: string) {
    updateSong((currentSong) => ({
      ...currentSong,
      sections: currentSong.sections.map((section) => {
        if (section.id !== sectionId) {
          return section
        }

        return {
          ...section,
          bars: section.bars.map((bar) =>
            bar.id === barId ? { ...bar, chord } : bar,
          ),
        }
      }),
    }))
  }

  function duplicateBars(sectionId: string, startIndex: number) {
    updateSong((currentSong) => ({
      ...currentSong,
      sections: currentSong.sections.map((section) => {
        if (section.id !== sectionId) {
          return section
        }

        const barsToDuplicate = section.bars.slice(startIndex, startIndex + 4)

        if (barsToDuplicate.length === 0) {
          return section
        }

        const nextBars = [...section.bars]
        nextBars.splice(
          startIndex + barsToDuplicate.length,
          0,
          ...barsToDuplicate.map((bar) => ({
            ...bar,
            id: createBarId(section.id),
          })),
        )

        return {
          ...section,
          bars: nextBars,
        }
      }),
    }))
  }

  function addEmptyBarsAfter(sectionId: string, startIndex: number) {
    updateSong((currentSong) => ({
      ...currentSong,
      sections: currentSong.sections.map((section) => {
        if (section.id !== sectionId) {
          return section
        }

        const nextBars = [...section.bars]
        nextBars.splice(
          startIndex + 4,
          0,
          ...createEmptyBars(section.id, 4),
        )

        return {
          ...section,
          bars: nextBars,
        }
      }),
    }))
  }

  function deleteBars(sectionId: string, startIndex: number) {
    updateSong((currentSong) => ({
      ...currentSong,
      sections: currentSong.sections.map((section) => {
        if (section.id !== sectionId) {
          return section
        }

        const nextBars = section.bars.filter(
          (_, index) => index < startIndex || index >= startIndex + 4,
        )

        return {
          ...section,
          bars: nextBars,
        }
      }),
    }))
  }

  function moveBarLine(
    fromSectionId: string,
    fromStartIndex: number,
    toSectionId: string,
    toStartIndex: number,
  ) {
    updateSong((currentSong) => {
      const fromSectionIndex = currentSong.sections.findIndex(
        (section) => section.id === fromSectionId,
      )
      const toSectionIndex = currentSong.sections.findIndex(
        (section) => section.id === toSectionId,
      )

      if (fromSectionIndex === -1 || toSectionIndex === -1) {
        return currentSong
      }

      const sourceBars = currentSong.sections[fromSectionIndex].bars
      const barsToMove = sourceBars.slice(fromStartIndex, fromStartIndex + 4)

      if (barsToMove.length === 0) {
        return currentSong
      }

      if (
        fromSectionId === toSectionId &&
        toStartIndex >= fromStartIndex &&
        toStartIndex <= fromStartIndex + barsToMove.length
      ) {
        return currentSong
      }

      const nextSections = currentSong.sections.map((section) => ({
        ...section,
        bars: [...section.bars],
      }))

      nextSections[fromSectionIndex].bars.splice(
        fromStartIndex,
        barsToMove.length,
      )

      const adjustedToStartIndex =
        fromSectionId === toSectionId && toStartIndex > fromStartIndex
          ? toStartIndex - barsToMove.length
          : toStartIndex

      nextSections[toSectionIndex].bars.splice(
        adjustedToStartIndex,
        0,
        ...barsToMove,
      )

      return {
        ...currentSong,
        sections: nextSections,
      }
    })
  }

  function addSectionAfterLine(sectionId: string, startIndex: number) {
    updateSong((currentSong) => {
      const sectionIndex = currentSong.sections.findIndex(
        (section) => section.id === sectionId,
      )

      if (sectionIndex === -1) {
        return currentSong
      }

      const currentSection = currentSong.sections[sectionIndex]
      const insertIndex = startIndex + 4
      const nextSectionId = createSectionId()
      const shouldSplitSection = insertIndex < currentSection.bars.length
      const nextSections = [...currentSong.sections]

      nextSections[sectionIndex] = {
        ...currentSection,
        bars: shouldSplitSection
          ? currentSection.bars.slice(0, insertIndex)
          : currentSection.bars,
      }

      nextSections.splice(sectionIndex + 1, 0, {
        id: nextSectionId,
        name: 'Verse',
        repeatCount: 1,
        bars: shouldSplitSection
          ? currentSection.bars.slice(insertIndex)
          : createEmptyBars(nextSectionId, 4),
      })

      return {
        ...currentSong,
        sections: nextSections,
      }
    })
  }

  function mergeSection(sectionId: string) {
    updateSong((currentSong) => {
      const sectionIndex = currentSong.sections.findIndex(
        (section) => section.id === sectionId,
      )

      if (sectionIndex === -1 || currentSong.sections.length === 1) {
        return currentSong
      }

      const nextSections = currentSong.sections.filter(
        (section) => section.id !== sectionId,
      )
      const removedSection = currentSong.sections[sectionIndex]

      if (sectionIndex === 0) {
        nextSections[0] = {
          ...nextSections[0],
          bars: [...removedSection.bars, ...nextSections[0].bars],
        }
      } else {
        nextSections[sectionIndex - 1] = {
          ...nextSections[sectionIndex - 1],
          bars: [...nextSections[sectionIndex - 1].bars, ...removedSection.bars],
        }
      }

      return {
        ...currentSong,
        sections: nextSections,
      }
    })
  }

  function moveSection(fromId: string, toId: string, position: 'before' | 'after') {
    updateSong(current => {
      if (fromId === toId) return current
      const moved = current.sections.find(section => section.id === fromId)
      if (!moved || !current.sections.some(section => section.id === toId)) return current
      const sections = current.sections.filter(section => section.id !== fromId)
      const index = sections.findIndex(section => section.id === toId)
      sections.splice(index + (position === 'after' ? 1 : 0), 0, moved)
      if (sections.every((section, i) => section === current.sections[i])) return current
      return { ...current, sections }
    })
  }

  function deleteSection(sectionId: string) {
    updateSong((currentSong) => {
      const sectionIndex = currentSong.sections.findIndex(
        (section) => section.id === sectionId,
      )

      if (sectionIndex === -1) {
        return currentSong
      }

      const nextSections = currentSong.sections.filter(
        (section) => section.id !== sectionId,
      )

      if (nextSections.length > 0) {
        return {
          ...currentSong,
          sections: nextSections,
        }
      }

      const nextSectionId = createSectionId()

      return {
        ...currentSong,
        sections: [
          {
            id: nextSectionId,
            name: 'Intro',
            repeatCount: 1,
            bars: createEmptyBars(nextSectionId, 4),
          },
        ],
      }
    })
  }

  function duplicateSection(sectionId: string) {
    updateSong((currentSong) => {
      const sectionIndex = currentSong.sections.findIndex(
        (section) => section.id === sectionId,
      )

      if (sectionIndex === -1) {
        return currentSong
      }

      const sourceSection = currentSong.sections[sectionIndex]
      const nextSectionId = createSectionId()
      const duplicatedSection = {
        ...sourceSection,
        id: nextSectionId,
        name: `${sourceSection.name} copy`,
        bars: sourceSection.bars.map((bar) => ({
          ...bar,
          id: createBarId(nextSectionId),
        })),
      }
      const nextSections = [...currentSong.sections]
      nextSections.splice(sectionIndex + 1, 0, duplicatedSection)

      return {
        ...currentSong,
        sections: nextSections,
      }
    })
  }

  return {
    song,
    canUndo: history.past.length > 0,
    undo,
    createNewSong,
    loadSong,
    saveSong,
    isDirty,
    saveSongCopy,
    importSongs,
    savedSongs: library.songs,
    activeSongId: library.activeSongId,
    storageError,
    updateSongTitle,
    updateTranspose,
    updatePreviewFontSize,
    updatePreviewBold,
    updateChordColor,
    updateGridColor,
    updateSongArtist,
    updateSongStyle,
    updateTempo,
    updateSectionName,
    updateSectionPlayback,
    updateSectionRepeatCount,
    updateBarChord,
    updateBarLyrics,
    normalizeBarChord,
    duplicateBars,
    addEmptyBarsAfter,
    deleteBars,
    moveBarLine,
    addSectionAfterLine,
    mergeSection,
    moveSection,
    deleteSection,
    duplicateSection,
  }
}

function updateBarInSong(song: Song, sectionId: string, barId: string, chord: string) {
  return {
    ...song,
    sections: song.sections.map((section) => {
      if (section.id !== sectionId) {
        return section
      }

      return {
        ...section,
        bars: section.bars.map((bar) =>
          bar.id === barId ? { ...bar, chord } : bar,
        ),
      }
    }),
  }
}

function getPreviousResolvedChord(song: Song, targetBarId: string) {
  let previousChord: string | null = null

  for (const section of song.sections) {
    for (const bar of section.bars) {
      if (bar.id === targetBarId) {
        return previousChord
      }

      const parsedBar = parseBarChords(bar.chord, previousChord)

      if (parsedBar.valid) {
        previousChord = parsedBar.lastResolvedChord
      }
    }
  }

  return previousChord
}

function createBarId(sectionId: string) {
  return `${sectionId}-${createId()}`
}

function createSectionId() {
  return `section-${createId()}`
}

function createEmptyBars(sectionId: string, count: number) {
  return Array.from({ length: count }, () => ({
    id: createBarId(sectionId),
    chord: '',
  }))
}
