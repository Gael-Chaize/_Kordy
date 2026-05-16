export type ParsedChord =
  | {
      valid: true
      normalized: string
      root: string
      quality: ChordQuality
      modifiers: ChordModifier[]
    }
  | {
      valid: false
      normalized: null
      root: null
      quality: null
      modifiers: null
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
  | 'dominant7sus2'
  | 'dominant7sus4'
  | 'dominant9'
  | 'dominant11'
  | 'dominant13'
  | 'major7'
  | 'major9'
  | 'major11'
  | 'major13'
  | 'minor7'
  | 'minor9'
  | 'minor11'
  | 'minor13'
  | 'minorMajor7'
  | 'minorMajor9'
  | 'minorMajor11'
  | 'minorMajor13'
  | 'major6'
  | 'minor6'
  | 'minor7b5'
  | 'diminished'
  | 'augmented'
  | 'sus2'
  | 'sus4'
  | 'power5'

export type ChordModifier =
  | {
      kind: 'degree'
      degree: number
      accidental: 'b' | '#' | null
    }
  | {
      kind: 'compound'
      degrees: number[]
    }

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
  ['dominant7sus2', [0, 2, 7, 10]],
  ['dominant7sus4', [0, 5, 7, 10]],
  ['dominant9', [0, 4, 7, 10, 14]],
  ['dominant11', [0, 4, 7, 10, 14, 17]],
  ['dominant13', [0, 4, 7, 10, 14, 17, 21]],
  ['major7', [0, 4, 7, 11]],
  ['major9', [0, 4, 7, 11, 14]],
  ['major11', [0, 4, 7, 11, 14, 17]],
  ['major13', [0, 4, 7, 11, 14, 17, 21]],
  ['minor7', [0, 3, 7, 10]],
  ['minor9', [0, 3, 7, 10, 14]],
  ['minor11', [0, 3, 7, 10, 14, 17]],
  ['minor13', [0, 3, 7, 10, 14, 17, 21]],
  ['minorMajor7', [0, 3, 7, 11]],
  ['minorMajor9', [0, 3, 7, 11, 14]],
  ['minorMajor11', [0, 3, 7, 11, 14, 17]],
  ['minorMajor13', [0, 3, 7, 11, 14, 17, 21]],
  ['major6', [0, 4, 7, 9]],
  ['minor6', [0, 3, 7, 9]],
  ['minor7b5', [0, 3, 6, 10]],
  ['diminished', [0, 3, 6]],
  ['augmented', [0, 4, 8]],
  ['sus2', [0, 2, 7]],
  ['sus4', [0, 5, 7]],
  ['power5', [0, 7]],
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
    ['maj', { quality: 'major', suffix: 'M' }],
    ['m', { quality: 'minor', suffix: 'm' }],
    ['-', { quality: 'minor', suffix: 'm' }],
    ['min', { quality: 'minor', suffix: 'm' }],
    ['5', { quality: 'power5', suffix: '5' }],
    ['6', { quality: 'major6', suffix: '6' }],
    ['M6', { quality: 'major6', suffix: '6' }],
    ['m6', { quality: 'minor6', suffix: 'm6' }],
    ['-6', { quality: 'minor6', suffix: 'm6' }],
    ['7', { quality: 'dominant7', suffix: '7' }],
    ['7sus2', { quality: 'dominant7sus2', suffix: '7sus2' }],
    ['7sus4', { quality: 'dominant7sus4', suffix: '7sus4' }],
    ['7sus', { quality: 'dominant7sus4', suffix: '7sus4' }],
    ['9', { quality: 'dominant9', suffix: '9' }],
    ['11', { quality: 'dominant11', suffix: '11' }],
    ['13', { quality: 'dominant13', suffix: '13' }],
    ['maj7', { quality: 'major7', suffix: 'M7' }],
    ['M7', { quality: 'major7', suffix: 'M7' }],
    ['maj9', { quality: 'major9', suffix: 'M9' }],
    ['M9', { quality: 'major9', suffix: 'M9' }],
    ['maj11', { quality: 'major11', suffix: 'M11' }],
    ['M11', { quality: 'major11', suffix: 'M11' }],
    ['maj13', { quality: 'major13', suffix: 'M13' }],
    ['M13', { quality: 'major13', suffix: 'M13' }],
    ['m7', { quality: 'minor7', suffix: 'm7' }],
    ['-7', { quality: 'minor7', suffix: 'm7' }],
    ['m9', { quality: 'minor9', suffix: 'm9' }],
    ['-9', { quality: 'minor9', suffix: 'm9' }],
    ['m11', { quality: 'minor11', suffix: 'm11' }],
    ['-11', { quality: 'minor11', suffix: 'm11' }],
    ['m13', { quality: 'minor13', suffix: 'm13' }],
    ['-13', { quality: 'minor13', suffix: 'm13' }],
    ['mmaj7', { quality: 'minorMajor7', suffix: 'mmaj7' }],
    ['mMaj7', { quality: 'minorMajor7', suffix: 'mmaj7' }],
    ['mM7', { quality: 'minorMajor7', suffix: 'mmaj7' }],
    ['minmaj7', { quality: 'minorMajor7', suffix: 'mmaj7' }],
    ['minMaj7', { quality: 'minorMajor7', suffix: 'mmaj7' }],
    ['minmaj9', { quality: 'minorMajor9', suffix: 'mmaj9' }],
    ['mmaj9', { quality: 'minorMajor9', suffix: 'mmaj9' }],
    ['mMaj9', { quality: 'minorMajor9', suffix: 'mmaj9' }],
    ['mM9', { quality: 'minorMajor9', suffix: 'mmaj9' }],
    ['minmaj11', { quality: 'minorMajor11', suffix: 'mmaj11' }],
    ['mmaj11', { quality: 'minorMajor11', suffix: 'mmaj11' }],
    ['mMaj11', { quality: 'minorMajor11', suffix: 'mmaj11' }],
    ['mM11', { quality: 'minorMajor11', suffix: 'mmaj11' }],
    ['minmaj13', { quality: 'minorMajor13', suffix: 'mmaj13' }],
    ['mmaj13', { quality: 'minorMajor13', suffix: 'mmaj13' }],
    ['mMaj13', { quality: 'minorMajor13', suffix: 'mmaj13' }],
    ['mM13', { quality: 'minorMajor13', suffix: 'mmaj13' }],
    ['minmaj', { quality: 'minorMajor7', suffix: 'mmaj7' }],
    ['m7b5', { quality: 'minor7b5', suffix: 'm7b5' }],
    ['-7b5', { quality: 'minor7b5', suffix: 'm7b5' }],
    ['dim', { quality: 'diminished', suffix: 'dim' }],
    ['aug', { quality: 'augmented', suffix: '+' }],
    ['+', { quality: 'augmented', suffix: '+' }],
    ['sus2', { quality: 'sus2', suffix: 'sus2' }],
    ['sus4', { quality: 'sus4', suffix: 'sus4' }],
    ['sus', { quality: 'sus4', suffix: 'sus4' }],
  ],
)

export function parseChordSymbol(input: string): ParsedChord {
  const chord = normalizeChordInput(input.trim())

  if (chord === '') {
    return invalidChord()
  }

  const { mainChord, slashBass, slashModifiers } = splitChordParts(chord)
  const rootMatch = findRoot(mainChord)

  if (!rootMatch) {
    return invalidChord()
  }

  const slashRoot = slashBass ? findRoot(slashBass) : null

  if (
    slashBass !== undefined &&
    (!slashRoot || slashRoot.length !== slashBass.length)
  ) {
    return invalidChord()
  }

  const remainder = mainChord.slice(rootMatch.length)
  const qualityAndModifiers = splitQualityAndModifiers(remainder)

  if (!qualityAndModifiers) {
    return invalidChord()
  }

  const { qualityText, modifiersText, outsideModifiers } = qualityAndModifiers
  const quality =
    qualityNames.get(qualityText) ??
    (qualityText === '' && outsideModifiers.length > 0
      ? qualityNames.get('')
      : undefined)

  if (!quality) {
    return invalidChord()
  }

  const modifiersFromParens = parseModifiersText(modifiersText)

  if (modifiersText !== null && !modifiersFromParens) {
    return invalidChord()
  }

  const modifiers = [
    ...(modifiersFromParens ?? []),
    ...outsideModifiers,
    ...slashModifiers,
  ]
  const shouldShowModifiers =
    modifiersText !== null || outsideModifiers.length > 0 || slashModifiers.length > 0

  return {
    valid: true,
    normalized: `${rootMatch.normalized}${quality.suffix}${formatModifiers(
      modifiers,
      shouldShowModifiers,
    )}${
      slashRoot ? `/${slashRoot.normalized}` : ''
    }`,
    root: rootMatch.normalized,
    quality: quality.quality,
    modifiers,
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
  const chordTexts = tokenizeBarChordInput(input)

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

  const resolvedIntervals = applyChordModifiers(intervals, chord.modifiers)

  return resolvedIntervals.map((interval) => midiToNote(rootMidi + interval))
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
    chordSymbols: parsedBar.chordSymbols,
    lastResolvedChord: parsedBar.lastResolvedChord,
  }
}

export function buildBassPatternNotes(chordSymbol: string, octave = 2) {
  const chord = parseChordSymbol(chordSymbol)

  if (!chord.valid) {
    return null
  }

  const rootMidi = 12 * (octave + 1) + rootToSemitone(chord.root)
  const intervals = chordIntervals.get(chord.quality)

  if (!intervals) {
    return null
  }

  const patternDegrees =
    intervals.length >= 4 ? [0, 1, 2, 3, 2, 1, 0, 1] : [0, 1, 2, 0, 2, 1, 0, 1]

  return patternDegrees.map((degreeIndex) =>
    midiToNote(rootMidi + intervals[degreeIndex]),
  )
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
    modifiers: null,
  }
}

function splitChordParts(input: string): {
  mainChord: string
  slashBass: string | undefined
  slashModifiers: ChordModifier[]
} {
  const parts = splitOutsideParentheses(input, '/')

  if (parts.length <= 1) {
    return { mainChord: input, slashBass: undefined, slashModifiers: [] }
  }

  const lastPart = parts[parts.length - 1]?.trim() ?? ''
  const lastRoot = lastPart ? findRoot(lastPart) : null
  const hasBass = !!lastRoot && lastRoot.length === lastPart.length
  const slashBass = hasBass ? lastPart : undefined

  const bodyParts = hasBass ? parts.slice(0, -1) : parts
  const mainChord = bodyParts[0] ?? ''
  const slashModifiers: ChordModifier[] = []

  for (let index = 1; index < bodyParts.length; index += 1) {
    const segment = bodyParts[index]?.trim() ?? ''
    if (segment === '') return { mainChord: input, slashBass: undefined, slashModifiers: [] }

    const modifier = parseSlashModifierSegment(segment)
    if (!modifier) {
      // Fallback: treat entire thing as a plain slash chord to preserve old behaviour (and fail later if invalid).
      return { mainChord: input, slashBass: undefined, slashModifiers: [] }
    }

    slashModifiers.push(modifier)
  }

  return { mainChord, slashBass, slashModifiers }
}

function splitOutsideParentheses(input: string, separator: string) {
  const parts: string[] = []
  let depth = 0
  let current = ''

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]

    if (char === '(') depth += 1
    if (char === ')') depth = Math.max(0, depth - 1)

    if (char === separator && depth === 0) {
      parts.push(current)
      current = ''
      continue
    }

    current += char
  }

  parts.push(current)
  return parts
}

function parseSlashModifierSegment(segment: string): ChordModifier | null {
  // Accept 6/9 style notation without parentheses by treating numeric slash segments as modifiers.
  const match = /^([#b]?)(\d+)$/.exec(segment)
  if (!match) return null

  const [, accidentalText, degreeText] = match
  const degree = Number(degreeText)
  if (!Number.isFinite(degree) || degree <= 0) return null

  const accidental =
    accidentalText === 'b' ? 'b' : accidentalText === '#' ? '#' : null

  return { kind: 'degree', degree, accidental }
}

function normalizeChordInput(input: string) {
  if (!/\s/.test(input)) {
    return input
  }

  // Only accept spaced sharp extensions by rewriting them into parentheses,
  // e.g. "G #11" -> "G(#11)".
  const rewritten = rewriteSharpExtensions(input)

  // Any remaining whitespace makes the chord ambiguous / hard to render in the grid,
  // so we reject it.
  return /\s/.test(rewritten) ? '' : rewritten
}

function rewriteSharpExtensions(input: string) {
  let output = ''
  let index = 0

  while (index < input.length) {
    const char = input[index]

    if (!/\s/.test(char)) {
      output += char
      index += 1
      continue
    }

    let lookahead = index
    while (lookahead < input.length && /\s/.test(input[lookahead])) {
      lookahead += 1
    }

    if (lookahead >= input.length) {
      break
    }

    if (input[lookahead] !== '#') {
      output += ' '
      index = lookahead
      continue
    }

    lookahead += 1
    while (lookahead < input.length && /\s/.test(input[lookahead])) {
      lookahead += 1
    }

    let digitStart = lookahead
    while (lookahead < input.length && /\d/.test(input[lookahead])) {
      lookahead += 1
    }

    if (digitStart === lookahead) {
      // Not a "#<digits>" extension, keep whitespace.
      output += ' '
      index = digitStart - 1
      continue
    }

    output += `(#${input.slice(digitStart, lookahead)})`
    index = lookahead
  }

  return output.trim()
}

function splitQualityAndModifiers(remainder: string): {
  qualityText: string
  modifiersText: string | null
  outsideModifiers: ChordModifier[]
} | null {
  const trimmed = remainder.trim()

  if (trimmed === '') {
    return { qualityText: '', modifiersText: null, outsideModifiers: [] }
  }

  const openIndex = trimmed.indexOf('(')

  if (openIndex === -1) {
    const parsed = parseOutsideModifiers(trimmed)
    if (!parsed) return null
    return { ...parsed, modifiersText: null }
  }

  if (!trimmed.endsWith(')')) {
    return null
  }

  const beforeParens = trimmed.slice(0, openIndex)
  const modifiersText = trimmed.slice(openIndex + 1, -1)

  const parsed = parseOutsideModifiers(beforeParens)
  if (!parsed) return null

  return { ...parsed, modifiersText }
}

function parseOutsideModifiers(input: string): {
  qualityText: string
  outsideModifiers: ChordModifier[]
} | null {
  const trimmed = input.trim()

  if (trimmed === '') {
    return { qualityText: '', outsideModifiers: [] }
  }

  let working = trimmed
  const outsideModifiers: ChordModifier[] = []

  const lower = () => working.toLocaleLowerCase('fr-FR')
  const takeSuffix = (suffix: string) => {
    if (!lower().endsWith(suffix)) return false
    working = working.slice(0, working.length - suffix.length)
    return true
  }

  // Accept add modifiers outside parentheses: e.g. Cadd9, Cmadd9, CM7add13,
  // and with accidentals: Caddb9, Cadd#11.
  // Multiple adds are supported: Cadd9add11
  const addRegex = /add([#b]?)(\d+)$/i
  const addDegrees: { degree: number; accidental: 'b' | '#' | null }[] = []
  while (true) {
    const match = addRegex.exec(working)
    if (!match) break

    const accidentalText = match[1]
    const degree = Number(match[2])
    if (!Number.isFinite(degree) || degree <= 0) {
      return null
    }

    const accidental =
      accidentalText === 'b' ? 'b' : accidentalText === '#' ? '#' : null

    addDegrees.push({ degree, accidental })
    working = working.slice(0, match.index)
  }

  // Accept e.g. G7alt, Galt as a shorthand for a dominant chord with altered colour.
  // We interpret "alt" musically by defaulting to b5 and #9 additions.
  const hasAlt = takeSuffix('alt')

  if (hasAlt && working.trim() === '') {
    working = '7'
  }

  for (const modifier of addDegrees.reverse()) {
    outsideModifiers.push({
      kind: 'degree',
      degree: modifier.degree,
      accidental: modifier.accidental,
    })
  }

  if (hasAlt) {
    outsideModifiers.push({ kind: 'degree', degree: 5, accidental: 'b' })
    outsideModifiers.push({ kind: 'degree', degree: 9, accidental: '#' })
  }

  return { qualityText: working, outsideModifiers }
}

function parseModifiersText(input: string | null): ChordModifier[] | null {
  if (input === null) {
    return []
  }

  const trimmed = input.trim()

  if (trimmed === '') {
    return []
  }

  const tokenRegex = /([#b]?)(\d+)(?:\/(\d+))?/g
  const modifiers: ChordModifier[] = []
  let match: RegExpExecArray | null
  let consumed = 0

  while ((match = tokenRegex.exec(trimmed)) !== null) {
    const [raw, accidentalText, degreeText, slashDegreeText] = match

    if (match.index !== consumed) {
      const gap = trimmed.slice(consumed, match.index).trim()
      if (gap !== '' && gap !== ',' && gap !== ';') {
        return null
      }
    }

    consumed = match.index + raw.length

    const degree = Number(degreeText)

    if (!Number.isFinite(degree) || degree <= 0) {
      return null
    }

    if (slashDegreeText !== undefined) {
      const otherDegree = Number(slashDegreeText)
      if (!Number.isFinite(otherDegree) || otherDegree <= 0) {
        return null
      }

      modifiers.push({ kind: 'compound', degrees: [degree, otherDegree] })
      continue
    }

    const accidental =
      accidentalText === 'b' ? 'b' : accidentalText === '#' ? '#' : null

    modifiers.push({ kind: 'degree', degree, accidental })
  }

  if (consumed < trimmed.length) {
    const rest = trimmed.slice(consumed).trim()
    if (rest !== '' && rest !== ',' && rest !== ';') {
      return null
    }
  }

  return modifiers
}

function formatModifiers(modifiers: ChordModifier[], enabled: boolean): string {
  if (!enabled) return ''

  if (modifiers.length === 0) {
    return '()'
  }

  const parts = modifiers.map((modifier) => {
    if (modifier.kind === 'compound') {
      return modifier.degrees.join('/')
    }

    const accidental = modifier.accidental ?? ''
    return `${accidental}${modifier.degree}`
  })

  return `(${parts.join('')})`
}

function applyChordModifiers(
  baseIntervals: number[],
  modifiers: ChordModifier[],
): number[] {
  const intervals = [...baseIntervals]

  const addOrReplaceDegree = (degree: number, semitone: number) => {
    const degreeBuckets: Record<number, number[]> = {
      2: [1, 2, 3],
      3: [3, 4, 5],
      4: [4, 5, 6],
      5: [6, 7, 8],
      6: [8, 9, 10],
      7: [10, 11],
      9: [13, 14, 15],
      11: [16, 17, 18],
      13: [20, 21, 22],
    }

    const bucket = degreeBuckets[degree]

    if (bucket) {
      const existingIndex = intervals.findIndex((interval) => bucket.includes(interval))
      if (existingIndex >= 0) {
        intervals[existingIndex] = semitone
        return
      }
    }

    intervals.push(semitone)
  }

  for (const modifier of modifiers) {
    if (modifier.kind === 'compound') {
      for (const degree of modifier.degrees) {
        const interval = degreeToSemitone(degree, null)
        if (interval !== null) {
          addOrReplaceDegree(degree, interval)
        }
      }
      continue
    }

    const interval = degreeToSemitone(modifier.degree, modifier.accidental)
    if (interval !== null) {
      addOrReplaceDegree(modifier.degree, interval)
    }
  }

  return Array.from(new Set(intervals)).sort((a, b) => a - b)
}

function degreeToSemitone(
  degree: number,
  accidental: 'b' | '#' | null,
): number | null {
  const baseByDegree: Record<number, number> = {
    2: 2,
    4: 5,
    5: 7,
    6: 9,
    9: 14,
    11: 17,
    13: 21,
  }

  const base = baseByDegree[degree]

  if (base === undefined) {
    return null
  }

  const delta = accidental === 'b' ? -1 : accidental === '#' ? 1 : 0
  return base + delta
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

function tokenizeBarChordInput(input: string): string[] {
  const tokens: string[] = []
  let depth = 0
  let current = ''

  const flush = () => {
    const value = current.trim()
    if (value !== '') {
      tokens.push(value)
    }
    current = ''
  }

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]

    if (char === '(') {
      depth += 1
      current += char
      continue
    }

    if (char === ')') {
      depth = Math.max(0, depth - 1)
      current += char
      continue
    }

    if (depth === 0 && char === '|') {
      flush()
      continue
    }

    if (depth === 0 && /\s/.test(char)) {
      let lookahead = index
      while (lookahead < input.length && /\s/.test(input[lookahead])) {
        lookahead += 1
      }

      if (lookahead >= input.length) {
        flush()
        break
      }

      const next = input[lookahead]

      // Allow spaced sharp extensions inside a chord by rewriting them inline:
      // "G #11" -> "G(#11)". We do this here so we don't keep spaces in the grid.
      if (next === '#') {
        let cursor = lookahead + 1
        while (cursor < input.length && /\s/.test(input[cursor])) {
          cursor += 1
        }

        const digitStart = cursor
        while (cursor < input.length && /\d/.test(input[cursor])) {
          cursor += 1
        }

        if (digitStart !== cursor) {
          current += `(#${input.slice(digitStart, cursor)})`
          index = cursor - 1
          continue
        }
      }

      flush()
      index = lookahead - 1
      continue
    }

    current += char
  }

  flush()
  return tokens
}
