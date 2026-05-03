import * as Tone from 'tone'
import { buildBarChordNotes } from '../music/chords'
import type { Song } from '../music/types'

let synth: Tone.PolySynth<Tone.Synth> | null = null
let kick: Tone.MembraneSynth | null = null
let snare: Tone.NoiseSynth | null = null
let hiHat: Tone.NoiseSynth | null = null
let activeTimers: number[] = []
let resolvePlayback: (() => void) | null = null

type PlaybackOptions = {
  drumsEnabled: boolean
  onBarStart?: (barId: string) => void
}

export async function playSong(
  song: Song,
  options: PlaybackOptions = { drumsEnabled: false },
) {
  await Tone.start()
  stopSong()

  const piano = getSynth()
  const barDuration = 60 / song.tempo * 4
  const beatDuration = 60 / song.tempo
  const bars = song.sections.flatMap((section) => section.bars)
  let previousChord: string | null = null

  bars.forEach((bar, index) => {
    const barPlayback = buildBarChordNotes(bar.chord, previousChord)

    if (barPlayback) {
      previousChord = barPlayback.lastResolvedChord
    }

    activeTimers.push(
      window.setTimeout(() => {
        options.onBarStart?.(bar.id)

        if (!barPlayback) {
          return
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
              piano.triggerAttackRelease(
                notes,
                Math.max(0.1, chordDuration * 0.88),
                undefined,
                0.75,
              )
            }, Math.ceil(chordOffset * 1000)),
          )
        })
      }, Math.ceil(index * barDuration * 1000)),
    )
  })

  if (options.drumsEnabled) {
    scheduleDrums(bars.length, beatDuration)
  }

  return new Promise<void>((resolve) => {
    resolvePlayback = resolve
    activeTimers.push(
      window.setTimeout(() => {
        resolvePlayback = null
        activeTimers = []
        resolve()
      }, Math.ceil(bars.length * barDuration * 1000)),
    )
  })
}

export function stopSong() {
  activeTimers.forEach((timerId) => window.clearTimeout(timerId))
  activeTimers = []
  synth?.releaseAll()
  kick?.triggerRelease()
  snare?.triggerRelease()
  hiHat?.triggerRelease()
  resolvePlayback?.()
  resolvePlayback = null
}

function scheduleDrums(barCount: number, beatDuration: number) {
  const kit = getDrumKit()
  const totalBeats = barCount * 4

  for (let beat = 0; beat < totalBeats; beat += 1) {
    activeTimers.push(
      window.setTimeout(() => {
        kit.kick.triggerAttackRelease('C1', '8n', undefined, 0.85)

        if (beat % 4 === 1 || beat % 4 === 3) {
          kit.snare.triggerAttackRelease('16n', undefined, 0.55)
        }
      }, Math.ceil(beat * beatDuration * 1000)),
    )
  }

  for (let step = 0; step < totalBeats * 2; step += 1) {
    activeTimers.push(
      window.setTimeout(() => {
        kit.hiHat.triggerAttackRelease('32n', undefined, 0.22)
      }, Math.ceil(step * beatDuration * 500)),
    )
  }
}

function getSynth() {
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'triangle',
      },
      envelope: {
        attack: 0.02,
        decay: 0.18,
        sustain: 0.35,
        release: 0.8,
      },
    }).toDestination()

    synth.volume.value = -8
  }

  return synth
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
