import { useEffect, useState } from 'react'
import { normalizeBarChords, parseBarChords } from '../music/chords'
import type { Song } from '../music/types'
import { clearStoredSong, loadStoredSong, saveStoredSong } from './songStorage'

const initialSong: Song = {
  title: 'Untitled chart',
  tempo: 120,
  sections: [
    {
      id: 'intro',
      name: 'Intro',
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
  const [history, setHistory] = useState(() => ({
    past: [] as Song[],
    present: loadStoredSong() ?? initialSong,
  }))

  const song = history.present

  useEffect(() => {
    saveStoredSong(song)
  }, [song])

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
    clearStoredSong()
    updateSong(() => initialSong)
  }

  function updateSongTitle(title: string) {
    updateSong((currentSong) => ({
      ...currentSong,
      title,
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

  function updateBarChord(sectionId: string, barId: string, chord: string) {
    updateBar(sectionId, barId, chord)
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
          bars:
            nextBars.length > 0 ? nextBars : createEmptyBars(section.id, 4),
        }
      }),
    }))
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

  function removeSection(sectionId: string) {
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

  return {
    song,
    canUndo: history.past.length > 0,
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
  return `${sectionId}-${crypto.randomUUID()}`
}

function createSectionId() {
  return `section-${crypto.randomUUID()}`
}

function createEmptyBars(sectionId: string, count: number) {
  return Array.from({ length: count }, () => ({
    id: createBarId(sectionId),
    chord: '',
  }))
}
