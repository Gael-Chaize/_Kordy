import { parseChordSymbol } from './chords'

const sharps = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const flats = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const naturals: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const mod = (value: number) => ((value % 12) + 12) % 12

function pitch(root: string) {
  return naturals[root[0]] + (root[1] === '#' ? 1 : root[1] === 'b' ? -1 : 0)
}

export function transposeChord(text: string, semitones: number) {
  if (!semitones || text === '%') return text
  const chord = parseChordSymbol(text)
  if (!chord.valid) return text
  const names = chord.root.includes('b') || semitones < 0 ? flats : sharps
  const shift = (root: string) => names[mod(pitch(root) + semitones)]
  return chord.normalized.replace(/^[A-G][#b]?/, shift).replace(/\/([A-G][#b]?)$/, (_, bass: string) => `/${shift(bass)}`)
}

export function transposeBar(text: string, semitones: number) {
  if (!semitones) return text
  return text.replace(/[^\s|]+/g, token => transposeChord(token, semitones))
}

export function transposeNote(note: string, semitones: number) {
  if (!semitones) return note
  const match = /^([A-G][#b]?)(-?\d+)$/.exec(note)
  if (!match) return note
  const midi = (Number(match[2]) + 1) * 12 + pitch(match[1]) + semitones
  return `${sharps[mod(midi)]}${Math.floor(midi / 12) - 1}`
}
