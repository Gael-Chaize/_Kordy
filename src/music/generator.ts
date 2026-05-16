import type { Song } from './types'

export type Accidental = '' | 'b' | '#'

export type Cadence = {
  id: string
  label: string
  degrees: DegreeChord[]
}

type DegreeChord = {
  degree: number
  accidental?: -1 | 1
  suffix: string
}

export const generatorCadences: Cadence[] = [
  {
    id: 'one-four-flat-seven-four',
    label: 'I-IV-bVII-IV',
    degrees: [
      { degree: 1, suffix: '' },
      { degree: 4, suffix: '' },
      { degree: 7, accidental: -1, suffix: '' },
      { degree: 4, suffix: '' },
    ],
  },
  {
    id: 'two-five-one',
    label: 'II-V-I',
    degrees: [
      { degree: 2, suffix: 'm7' },
      { degree: 5, suffix: '7' },
      { degree: 1, suffix: 'maj7' },
    ],
  },
  {
    id: 'one-six-two-five',
    label: 'I-VI-II-V',
    degrees: [
      { degree: 1, suffix: 'maj7' },
      { degree: 6, suffix: 'm7' },
      { degree: 2, suffix: 'm7' },
      { degree: 5, suffix: '7' },
    ],
  },
  {
    id: 'one-five-six-four',
    label: 'I-V-VI-IV',
    degrees: [
      { degree: 1, suffix: '' },
      { degree: 5, suffix: '' },
      { degree: 6, suffix: 'm' },
      { degree: 4, suffix: '' },
    ],
  },
  {
    id: 'six-two-five-one',
    label: 'VI-II-V-I',
    degrees: [
      { degree: 6, suffix: 'm7' },
      { degree: 2, suffix: 'm7' },
      { degree: 5, suffix: '7' },
      { degree: 1, suffix: 'maj7' },
    ],
  },
  {
    id: 'one-flat-seven-flat-six-five',
    label: 'I-bVII-bVI-V',
    degrees: [
      { degree: 1, suffix: '' },
      { degree: 7, accidental: -1, suffix: '' },
      { degree: 6, accidental: -1, suffix: '' },
      { degree: 5, suffix: '' },
    ],
  },
]

export const generatorTonalities = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
export const defaultGeneratorCadenceId = generatorCadences[0].id
export const defaultGeneratorTonality = 'C'
export const defaultGeneratorAccidental: Accidental = ''

const chromaticSharps = [
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
const chromaticFlats = [
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
const naturalSemitones = new Map([
  ['C', 0],
  ['D', 2],
  ['E', 4],
  ['F', 5],
  ['G', 7],
  ['A', 9],
  ['B', 11],
])
const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11]

export function createGeneratedSong(
  cadenceId: string,
  tonality: string,
  accidental: Accidental,
  tempo: number,
): Song {
  const selectedCadence = generatorCadences.find(
    (cadence) => cadence.id === cadenceId,
  )
  const cadence = selectedCadence ?? generatorCadences[0]
  const root = `${tonality}${accidental}`

  return {
    title: `${cadence.label} in ${root}`,
    artist: 'Unknown artist',
    style: 'Pop',
    tempo,
    sections: [
      {
        id: `generated-section-${crypto.randomUUID()}`,
        name: 'Generated',
        repeatCount: 1,
        bars: getFourBarCadence(cadence.degrees).map((degreeChord) => ({
          id: `generated-bar-${crypto.randomUUID()}`,
          chord:
            degreeChord === '%'
              ? '%'
              : buildChordSymbol(root, degreeChord),
        })),
      },
    ],
  }
}

function getFourBarCadence(degrees: DegreeChord[]) {
  const fourBarCadence: Array<DegreeChord | '%'> = degrees.slice(0, 4)

  while (fourBarCadence.length < 4) {
    fourBarCadence.push('%')
  }

  return fourBarCadence
}

function buildChordSymbol(root: string, degreeChord: DegreeChord) {
  if (degreeChord.degree === 1 && degreeChord.accidental === undefined) {
    return `${root}${degreeChord.suffix}`
  }

  const rootSemitone = rootToSemitone(root)
  const degreeSemitone =
    rootSemitone +
    majorScaleIntervals[degreeChord.degree - 1] +
    (degreeChord.accidental ?? 0)
  const preferFlats = root.includes('b') || degreeChord.accidental === -1
  const noteNames = preferFlats ? chromaticFlats : chromaticSharps

  return `${noteNames[mod(degreeSemitone, 12)]}${degreeChord.suffix}`
}

function rootToSemitone(root: string) {
  const natural = root.slice(0, 1)
  const base = naturalSemitones.get(natural) ?? 0
  const accidental = root.slice(1)

  if (accidental === '#') {
    return mod(base + 1, 12)
  }

  if (accidental === 'b') {
    return mod(base - 1, 12)
  }

  return base
}

function mod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor
}
