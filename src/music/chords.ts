export type ParsedChord =
  | {
      valid: true
      normalized: string
      root: string
      quality: ChordQuality
    }
  | {
      valid: false
      normalized: null
      root: null
      quality: null
    }

export type ParsedBarChords =
  | {
      valid: true
      complete: boolean
      chordSymbols: string[]
      lastResolvedChord: string | null
      normalized: string
    }
  | {
      valid: false
      complete: false
      chordSymbols: []
      lastResolvedChord: null
      normalized: null
    }

export type ChordQuality =
  | 'major'
  | 'minor'
  | 'dominant7'
  | 'major7'
  | 'minor7'
  | 'major6'
  | 'minor6'
  | 'diminished'
  | 'augmented'

const rootNames = [
  ['do', 'C'],
  ['re', 'D'],
  ['r\u00e9', 'D'],
  ['mi', 'E'],
  ['fa', 'F'],
  ['sol', 'G'],
  ['la', 'A'],
  ['si', 'B'],
  ['c', 'C'],
  ['d', 'D'],
  ['e', 'E'],
  ['f', 'F'],
  ['g', 'G'],
  ['a', 'A'],
  ['b', 'B'],
] as const

const rootSemitones = new Map([
  ['C', 0],
  ['D', 2],
  ['E', 4],
  ['F', 5],
  ['G', 7],
  ['A', 9],
  ['B', 11],
])

const chordIntervals = new Map<ChordQuality, number[]>([
  ['major', [0, 4, 7]],
  ['minor', [0, 3, 7]],
  ['dominant7', [0, 4, 7, 10]],
  ['major7', [0, 4, 7, 11]],
  ['minor7', [0, 3, 7, 10]],
  ['major6', [0, 4, 7, 9]],
  ['minor6', [0, 3, 7, 9]],
  ['diminished', [0, 3, 6]],
  ['augmented', [0, 4, 8]],
])

const chromaticNotes = [
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

const qualityNames = new Map<string, { quality: ChordQuality; suffix: string }>(
  [
    ['', { quality: 'major', suffix: '' }],
    ['M', { quality: 'major', suffix: '' }],
    ['maj', { quality: 'major', suffix: 'maj' }],
    ['m', { quality: 'minor', suffix: 'm' }],
    ['-', { quality: 'minor', suffix: 'm' }],
    ['6', { quality: 'major6', suffix: '6' }],
    ['M6', { quality: 'major6', suffix: '6' }],
    ['m6', { quality: 'minor6', suffix: 'm6' }],
    ['-6', { quality: 'minor6', suffix: 'm6' }],
    ['7', { quality: 'dominant7', suffix: '7' }],
    ['maj7', { quality: 'major7', suffix: 'maj7' }],
    ['M7', { quality: 'major7', suffix: 'maj7' }],
    ['m7', { quality: 'minor7', suffix: 'm7' }],
    ['-7', { quality: 'minor7', suffix: 'm7' }],
    ['dim', { quality: 'diminished', suffix: 'dim' }],
    ['aug', { quality: 'augmented', suffix: 'aug' }],
    ['+', { quality: 'augmented', suffix: 'aug' }],
  ],
)

export function parseChordSymbol(input: string): ParsedChord {
  const chord = input.trim()

  if (chord === '') {
    return invalidChord()
  }

  const rootMatch = findRoot(chord)

  if (!rootMatch) {
    return invalidChord()
  }

  const qualityText = chord.slice(rootMatch.length)
  const quality = qualityNames.get(qualityText)

  if (!quality) {
    return invalidChord()
  }

  return {
    valid: true,
    normalized: `${rootMatch.normalized}${quality.suffix}`,
    root: rootMatch.normalized,
    quality: quality.quality,
  }
}

export function isEmptyChord(input: string) {
  return input.trim() === ''
}

export function parseBarChords(
  input: string,
  previousChord: string | null = null,
): ParsedBarChords {
  if (isEmptyChord(input)) {
    return invalidBarChords()
  }

  const hasTrailingSeparator = /[\s|]$/.test(input)
  const chordTexts = input
    .trim()
    .split(/\s*\|\s*|\s+/)
    .filter(Boolean)

  if (chordTexts.length > 4) {
    return invalidBarChords()
  }

  let lastResolvedChord = previousChord
  const displaySymbols: string[] = []
  const resolvedSymbols: string[] = []

  for (const chordText of chordTexts) {
    if (chordText === '%') {
      if (!lastResolvedChord) {
        return invalidBarChords()
      }

      displaySymbols.push('%')
      resolvedSymbols.push(lastResolvedChord)
      continue
    }

    const chord = parseChordSymbol(chordText)

    if (!chord.valid) {
      return invalidBarChords()
    }

    displaySymbols.push(chord.normalized)
    resolvedSymbols.push(chord.normalized)
    lastResolvedChord = chord.normalized
  }

  return {
    valid: true,
    complete: !hasTrailingSeparator,
    chordSymbols: resolvedSymbols,
    lastResolvedChord,
    normalized: displaySymbols.join(' | '),
  }
}

export function normalizeBarChords(
  input: string,
  previousChord: string | null = null,
) {
  const parsedBar = parseBarChords(input, previousChord)

  if (!parsedBar.valid) {
    return null
  }

  return parsedBar.normalized
}

export function buildChordNotes(input: string, octave = 4) {
  const chord = parseChordSymbol(input)

  if (!chord.valid) {
    return null
  }

  const rootMidi = 12 * (octave + 1) + rootToSemitone(chord.root)
  const intervals = chordIntervals.get(chord.quality)

  if (!intervals) {
    return null
  }

  return intervals.map((interval) => midiToNote(rootMidi + interval))
}

export function buildBarChordNotes(
  input: string,
  previousChord: string | null = null,
  octave = 4,
) {
  const parsedBar = parseBarChords(input, previousChord)

  if (!parsedBar.valid || !parsedBar.complete) {
    return null
  }

  return {
    notes: parsedBar.chordSymbols.map((chord) => buildChordNotes(chord, octave)),
    lastResolvedChord: parsedBar.lastResolvedChord,
  }
}

function findRoot(chord: string) {
  const normalizedInput = chord.toLocaleLowerCase('fr-FR')
  const match = rootNames.find(([name]) => normalizedInput.startsWith(name))

  if (!match) {
    return null
  }

  const [name, root] = match
  const accidental = chord.slice(name.length, name.length + 1)

  if (accidental === '#' || accidental.toLocaleLowerCase('fr-FR') === 'b') {
    return {
      length: name.length + 1,
      normalized: `${root}${accidental === '#' ? '#' : 'b'}`,
    }
  }

  return {
    length: name.length,
    normalized: root,
  }
}

function rootToSemitone(root: string) {
  const natural = root.slice(0, 1)
  const accidental = root.slice(1)
  const baseSemitone = rootSemitones.get(natural) ?? 0

  if (accidental === '#') {
    return (baseSemitone + 1) % 12
  }

  if (accidental === 'b') {
    return (baseSemitone + 11) % 12
  }

  return baseSemitone
}

function midiToNote(midi: number) {
  const note = chromaticNotes[midi % 12]
  const octave = Math.floor(midi / 12) - 1

  return `${note}${octave}`
}

function invalidChord(): ParsedChord {
  return {
    valid: false,
    normalized: null,
    root: null,
    quality: null,
  }
}

function invalidBarChords(): ParsedBarChords {
  return {
    valid: false,
    complete: false,
    chordSymbols: [],
    lastResolvedChord: null,
    normalized: null,
  }
}
