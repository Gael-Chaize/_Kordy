import * as Tone from 'tone'
import {
  createBassInstrument,
  createPianoInstrument,
  type BassInstrument,
  type ChordInstrument,
  type PianoSound,
} from './instruments'
import { buildBarChordNotes, buildBassPatternNotes } from '../music/chords'
import type { Song } from '../music/types'

let synth: ChordInstrument | null = null
let bass: BassInstrument | null = null
let currentPianoSound: PianoSound | null = null
let kick: Tone.MembraneSynth | null = null
let snare: Tone.NoiseSynth | null = null
let hiHat: Tone.NoiseSynth | null = null
let activeTimers: number[] = []
let resolvePlayback: (() => void) | null = null

type PlaybackOptions = {
  drumsEnabled: boolean
  bassEnabled?: boolean
  pianoSound?: PianoSound
  startBarId?: string
  loopBarCount?: number
  loopSectionId?: string
  onBarStart?: (barId: string) => void
  onChordStart?: (barId: string, chordIndex: number | null) => void
  getTempo?: () => number
}

export async function playSong(
  song: Song,
  options: PlaybackOptions = { drumsEnabled: false },
) {
  await Tone.start()
  stopSong()

  const piano = getSynth(options.pianoSound ?? 'dx7')
  const bassInstrument = getBass()
  const allBars = song.sections.flatMap((section) =>
    Array.from({ length: section.repeatCount }, () =>
      section.bars.map((bar) => ({ bar, sectionId: section.id })),
    ).flat(),
  )
  const requestedStartIndex =
    options.loopSectionId !== undefined
      ? allBars.findIndex((entry) => entry.sectionId === options.loopSectionId)
      : allBars.findIndex((entry) => entry.bar.id === options.startBarId)
  const startIndex = Math.max(0, requestedStartIndex)
  const sectionLoopCount =
    options.loopSectionId !== undefined
      ? allBars.filter((entry) => entry.sectionId === options.loopSectionId).length
      : undefined
  const endIndex = options.loopBarCount
    ? Math.min(startIndex + options.loopBarCount, allBars.length)
    : sectionLoopCount
      ? Math.min(startIndex + sectionLoopCount, allBars.length)
    : allBars.length
  const bars = allBars.slice(startIndex, endIndex).map((entry) => entry.bar)
  let previousChord: string | null = null
  const allBarPlaybacks = allBars.map(({ bar }) => {
    const playback = buildBarChordNotes(bar.chord, previousChord)

    if (playback) {
      previousChord = playback.lastResolvedChord
    }

    return playback
  })
  const barPlaybacks = allBarPlaybacks.slice(startIndex, endIndex)

  return new Promise<void>((resolve) => {
    resolvePlayback = resolve
    scheduleBar(0)
  })

  function scheduleBar(index: number) {
    if (index >= bars.length) {
      if (options.loopBarCount || options.loopSectionId) {
        scheduleBar(0)
      } else {
        finishPlayback()
      }
      return
    }

    const tempo = options.getTempo?.() ?? song.tempo
    const beatDuration = 60 / tempo
    const barDuration = beatDuration * 4
    const bar = bars[index]
    const barPlayback = barPlaybacks[index]

    options.onBarStart?.(bar.id)
    options.onChordStart?.(bar.id, null)

    if (options.drumsEnabled) {
      scheduleBarDrums(beatDuration)
    }

    if (barPlayback) {
      if (options.bassEnabled) {
        scheduleBass(barPlayback.chordSymbols, beatDuration, bassInstrument)
      }

      barPlayback.notes.forEach((notes, chordIndex) => {
        if (!notes) {
          return
        }

        const chordDuration = barDuration / 4
        const chordOffset =
          barPlayback.notes.length === 2
            ? chordIndex * chordDuration * 2
            : chordIndex * chordDuration

        activeTimers.push(
          window.setTimeout(() => {
            options.onChordStart?.(bar.id, chordIndex)
            piano.triggerAttackRelease(
              notes,
              Math.max(0.1, chordDuration * 0.88),
              undefined,
              0.75,
            )
          }, Math.ceil(chordOffset * 1000)),
        )
      })
    }

    activeTimers.push(
      window.setTimeout(() => {
        scheduleBar(index + 1)
      }, Math.ceil(barDuration * 1000)),
    )
  }
}

export async function previewChord(chordText: string, pianoSound: PianoSound) {
  await Tone.start()

  const playback = buildBarChordNotes(chordText)

  if (!playback?.notes[0]) {
    return
  }

  getSynth(pianoSound).triggerAttackRelease(playback.notes[0], 0.65, undefined, 0.62)
}

export function stopSong() {
  activeTimers.forEach((timerId) => window.clearTimeout(timerId))
  activeTimers = []
  synth?.releaseAll()
  bass?.releaseAll()
  kick?.triggerRelease()
  snare?.triggerRelease()
  hiHat?.triggerRelease()
  finishPlayback()
}

function scheduleBass(
  chordSymbols: string[],
  beatDuration: number,
  bassInstrument: BassInstrument,
) {
  if (chordSymbols.length === 0) {
    return
  }

  for (let beat = 0; beat < 4; beat += 1) {
    const chordIndex =
      chordSymbols.length === 2 ? Math.floor(beat / 2) : Math.min(beat, chordSymbols.length - 1)
    const chordSymbol = chordSymbols[chordIndex]
    const pattern = buildBassPatternNotes(chordSymbol, 3)
    const note = pattern?.[beat % 8]

    if (!note) {
      continue
    }

    activeTimers.push(
      window.setTimeout(() => {
        bassInstrument.triggerAttackRelease(
          note,
          Math.max(0.08, beatDuration * 0.82),
          undefined,
          0.68,
        )
      }, Math.ceil(beat * beatDuration * 1000)),
    )
  }
}

function finishPlayback() {
  const resolve = resolvePlayback
  resolvePlayback = null
  activeTimers.forEach((timerId) => window.clearTimeout(timerId))
  activeTimers = []
  resolve?.()
}

function scheduleBarDrums(beatDuration: number) {
  const kit = getDrumKit()

  for (let beat = 0; beat < 4; beat += 1) {
    activeTimers.push(
      window.setTimeout(() => {
        kit.kick.triggerAttackRelease('C1', '8n', undefined, 0.85)

        if (beat === 1 || beat === 3) {
          kit.snare.triggerAttackRelease('16n', undefined, 0.55)
        }
      }, Math.ceil(beat * beatDuration * 1000)),
    )
  }

  for (let step = 0; step < 8; step += 1) {
    activeTimers.push(
      window.setTimeout(() => {
        kit.hiHat.triggerAttackRelease('32n', undefined, 0.22)
      }, Math.ceil(step * beatDuration * 500)),
    )
  }
}

function getSynth(sound: PianoSound) {
  if (!synth || currentPianoSound !== sound) {
    synth?.dispose()
    synth = createPianoInstrument(sound)
    currentPianoSound = sound
  }

  return synth
}

function getBass() {
  if (!bass) {
    bass = createBassInstrument()
  }

  return bass
}

function getDrumKit() {
  if (!kick) {
    kick = new Tone.MembraneSynth({
      pitchDecay: 0.04,
      octaves: 6,
      envelope: {
        attack: 0.001,
        decay: 0.35,
        sustain: 0.01,
        release: 0.15,
      },
    }).toDestination()

    kick.volume.value = -5
  }

  if (!snare) {
    snare = new Tone.NoiseSynth({
      noise: {
        type: 'white',
      },
      envelope: {
        attack: 0.001,
        decay: 0.16,
        sustain: 0,
        release: 0.08,
      },
    }).toDestination()

    snare.volume.value = -12
  }

  if (!hiHat) {
    hiHat = new Tone.NoiseSynth({
      noise: {
        type: 'brown',
      },
      envelope: {
        attack: 0.001,
        decay: 0.035,
        sustain: 0,
        release: 0.015,
      },
    }).toDestination()

    hiHat.volume.value = -22
  }

  return {
    kick,
    snare,
    hiHat,
  }
}
