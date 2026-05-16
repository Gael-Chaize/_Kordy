import { parseChordSymbol, type ChordQuality } from './chords'

export type ExpansionSuggestion = {
  id: string
  label: string
  description: string
  insertedChords: string[]
}

type ExpansionOptions = {
  availableSlots?: number
}

const sharpNotes = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
]
const flatNotes = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
]
const rootSemitones = new Map([
  ['C', 0],
  ['C#', 1],
  ['Db', 1],
  ['D', 2],
  ['D#', 3],
  ['Eb', 3],
  ['E', 4],
  ['F', 5],
  ['F#', 6],
  ['Gb', 6],
  ['G', 7],
  ['G#', 8],
  ['Ab', 8],
  ['A', 9],
  ['A#', 10],
  ['Bb', 10],
  ['B', 11],
])

export function suggestFreestyleExpansions(
  fromChord: string,
  toChord: string,
  options: ExpansionOptions = {},
): ExpansionSuggestion[] {
  try {
    const source = parseChordSymbol(fromChord)
    const target = parseChordSymbol(toChord)

    if (!source.valid || !target.valid) {
      return []
    }

    const suggestions: ExpansionSuggestion[] = []
    const seen = new Set<string>()
    const sourceSemitone = rootToSemitone(source.root)
    const targetSemitone = rootToSemitone(target.root)

    if (sourceSemitone === null || targetSemitone === null) {
      return []
    }

    const dominantRoot = semitoneToRoot(targetSemitone + 7, target.root)
    const targetIsMinor = isMinorQuality(target.quality)

    addSuggestion(suggestions, seen, {
      id: 'secondary-dominant',
      label: 'Secondary dominant',
      description: `Dominant seventh resolving into ${target.normalized}.`,
      insertedChords: [`${dominantRoot}7`],
    })

    addSuggestion(suggestions, seen, {
      id: 'backdoor-dominant',
      label: 'Backdoor dominant',
      description:
        'Uses bVII7 as a smoother jazz/soul-flavoured dominant approach into the target chord.',
      insertedChords: [`${semitoneToRoot(targetSemitone - 2, 'b')}7`],
    })

    if (options.availableSlots === undefined || options.availableSlots >= 2) {
      const iiRoot = semitoneToRoot(targetSemitone + 2, target.root)
      const iiChord = `${iiRoot}${targetIsMinor ? 'm7b5' : 'm7'}`

      addSuggestion(suggestions, seen, {
        id: 'ii-v-approach',
        label: 'ii-V approach',
        description: 'Adds a classic ii-V preparation before the target chord.',
        insertedChords: [iiChord, `${dominantRoot}7`],
      })
    }

    addSuggestion(suggestions, seen, {
      id: 'tritone-substitution',
      label: 'Tritone substitution',
      description: 'Chromatic dominant colour a tritone away from the secondary dominant.',
      insertedChords: [`${semitoneToRoot(targetSemitone + 1, 'b')}7`],
    })

    addSuggestion(suggestions, seen, {
      id: 'passing-diminished',
      label: 'Diminished passing chord',
      description: `A chromatic diminished chord above ${source.root}.`,
      insertedChords: [`${semitoneToRoot(sourceSemitone + 1, '#')}dim`],
    })

    const passingBass = createPassingBassChord(
      source.normalized,
      sourceSemitone,
      targetSemitone,
    )

    if (passingBass) {
      addSuggestion(suggestions, seen, {
        id: 'passing-bass',
        label: 'Passing bass',
        description: 'Keeps the harmony simple while moving the bass toward the next chord.',
        insertedChords: [passingBass],
      })
    }

    const modalColour = createModalColourChord(source.root, source.quality)

    if (modalColour) {
      addSuggestion(suggestions, seen, {
        id: 'modal-colour',
        label: 'Modal colour',
        description: `Borrowed colour from ${source.root} major/minor.`,
        insertedChords: [modalColour],
      })
    }

    return suggestions.slice(0, 7)
  } catch {
    return []
  }
}

function addSuggestion(
  suggestions: ExpansionSuggestion[],
  seen: Set<string>,
  suggestion: ExpansionSuggestion,
) {
  const key = suggestion.insertedChords.join(' ')

  if (seen.has(key)) {
    return
  }

  seen.add(key)
  suggestions.push(suggestion)
}

function createPassingBassChord(
  sourceChord: string,
  sourceSemitone: number,
  targetSemitone: number,
) {
  const descendingDistance = mod(sourceSemitone - targetSemitone, 12)
  const nearbyDistance = Math.min(
    mod(sourceSemitone - targetSemitone, 12),
    mod(targetSemitone - sourceSemitone, 12),
  )

  if (descendingDistance === 3 || descendingDistance === 4) {
    return `${semitoneToRoot(sourceSemitone + 7, '#')}/${semitoneToRoot(
      sourceSemitone - 1,
      'b',
    )}`
  }

  if (nearbyDistance > 0 && nearbyDistance <= 2) {
    const direction = mod(targetSemitone - sourceSemitone, 12) <= 2 ? 1 : -1

    return `${sourceChord}/${semitoneToRoot(sourceSemitone + direction, direction > 0 ? '#' : 'b')}`
  }

  return null
}

function isMinorQuality(quality: ChordQuality) {
  return (
    quality === 'minor' ||
    quality === 'minor6' ||
    quality === 'minor7' ||
    quality === 'minor9' ||
    quality === 'minor11' ||
    quality === 'minor13' ||
    quality === 'minorMajor7' ||
    quality === 'minorMajor9' ||
    quality === 'minorMajor11' ||
    quality === 'minorMajor13' ||
    quality === 'minor7b5'
  )
}

function createModalColourChord(root: string, quality: ChordQuality) {
  if (
    quality === 'minor' ||
    quality === 'minor6' ||
    quality === 'minor7' ||
    quality === 'minor9' ||
    quality === 'minor11' ||
    quality === 'minor13' ||
    quality === 'minorMajor7' ||
    quality === 'minorMajor9' ||
    quality === 'minorMajor11' ||
    quality === 'minorMajor13' ||
    quality === 'minor7b5'
  ) {
    return root
  }

  if (
    quality === 'major' ||
    quality === 'major6' ||
    quality === 'major7' ||
    quality === 'major9' ||
    quality === 'major11' ||
    quality === 'major13' ||
    quality === 'dominant7' ||
    quality === 'dominant7sus2' ||
    quality === 'dominant7sus4' ||
    quality === 'dominant9' ||
    quality === 'dominant11' ||
    quality === 'dominant13'
  ) {
    return `${root}m`
  }

  return null
}

function rootToSemitone(root: string) {
  return rootSemitones.get(root) ?? null
}

function semitoneToRoot(semitone: number, spellingHint: string) {
  const notes = spellingHint.includes('b') ? flatNotes : sharpNotes

  return notes[mod(semitone, 12)]
}

function mod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor
}
