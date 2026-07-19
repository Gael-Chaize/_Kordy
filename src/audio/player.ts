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
let activeTransportEvents: number[] = []
let activeChordPart: Tone.Part | null = null
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
  await prepareAudio()
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
    schedulePlayback()
  })

  function schedulePlayback() {
    const tempo = options.getTempo?.() ?? song.tempo
    const beatDuration = 60 / tempo
    const barDuration = beatDuration * 4

    Tone.Transport.stop()
    Tone.Transport.cancel(0)
    activeTransportEvents = []
    activeChordPart?.dispose()
    activeChordPart = null

    Tone.Transport.bpm.value = tempo
    Tone.Transport.loop = false
    Tone.Transport.loopStart = 0
    Tone.Transport.seconds = 0

    let transportTime = 0
    const chordEvents: Array<{
      time: number
      note: string
      duration: number
      velocity: number
    }> = []

    for (let index = 0; index < bars.length; index += 1) {
      const bar = bars[index]
      const barPlayback = barPlaybacks[index]

      activeTransportEvents.push(
        Tone.Transport.scheduleOnce(() => {
          options.onBarStart?.(bar.id)
          options.onChordStart?.(bar.id, null)
        }, transportTime),
      )

      if (options.drumsEnabled) {
        scheduleBarDrumsAt(transportTime, beatDuration)
      }

      if (barPlayback) {
        if (options.bassEnabled) {
          scheduleBassAt(
            transportTime,
            barPlayback.chordSymbols,
            beatDuration,
            bassInstrument,
          )
        }

        const chordDuration = barDuration / 4
        const chordSlotSeconds =
          barPlayback.notes.length === 2 ? chordDuration * 2 : chordDuration

        barPlayback.notes.forEach((notes, chordIndex) => {
          if (!notes) {
            return
          }

          const chordOffset =
            barPlayback.notes.length === 2
              ? chordIndex * chordDuration * 2
              : chordIndex * chordDuration
          const chordStartTime = transportTime + chordOffset
          const chordEndTime = chordStartTime + Math.max(0, chordSlotSeconds - 0.01)

          activeTransportEvents.push(
            Tone.Transport.scheduleOnce(() => {
              options.onChordStart?.(bar.id, chordIndex)
            }, chordStartTime),
          )

          // Prevent long-release presets (bell/rhodes) from piling up voices and
          // causing missing notes on later chords: force a gentle cutoff at the
          // end of each chord slot.
          activeTransportEvents.push(
            Tone.Transport.scheduleOnce(() => {
              piano.releaseAll()
            }, chordEndTime),
          )

          chordEvents.push(
            ...buildRolledChordEvents(
              notes,
              chordStartTime,
              chordDuration,
              chordSlotSeconds,
              0.62,
            ),
          )
        })
      }

      transportTime += barDuration
    }

    activeChordPart = new Tone.Part((time, value) => {
      piano.triggerAttackRelease(value.note, value.duration, time, value.velocity)
    }, chordEvents)
    activeChordPart.loop = false
    activeChordPart.start(0)

    const endTime = transportTime

    if (options.loopBarCount || options.loopSectionId) {
      Tone.Transport.loop = true
      Tone.Transport.loopEnd = endTime
    } else {
      activeTransportEvents.push(
        Tone.Transport.scheduleOnce(() => {
          finishPlayback()
        }, endTime),
      )
    }

    // Start slightly in the future to guarantee all events are scheduled ahead.
    Tone.Transport.start('+0.2')
  }
}

export async function previewChord(chordText: string, pianoSound: PianoSound) {
  await prepareAudio()

  const playback = buildBarChordNotes(chordText)

  if (!playback?.notes[0]) {
    return
  }

  const fallbackTempo = 120
  const beatDuration = 60 / fallbackTempo
  const lookAheadSeconds = Math.max(0.12, Tone.getContext().lookAhead ?? 0)
  const startTime = Tone.now() + lookAheadSeconds + 0.02
  const instrument = getSynth(pianoSound)

  buildRolledChordEvents(playback.notes[0], 0, beatDuration, beatDuration, 0.52).forEach(
    (event) => {
      instrument.triggerAttackRelease(
        event.note,
        event.duration,
        startTime + event.time,
        event.velocity,
      )
    },
  )
}

export function stopSong() {
  activeTimers.forEach((timerId) => window.clearTimeout(timerId))
  activeTimers = []
  activeTransportEvents.forEach((eventId) => Tone.Transport.clear(eventId))
  activeTransportEvents = []
  activeChordPart?.dispose()
  activeChordPart = null
  Tone.Transport.cancel(0)
  Tone.Transport.stop()
  synth?.releaseAll()
  bass?.releaseAll()
  kick?.triggerRelease()
  snare?.triggerRelease()
  hiHat?.triggerRelease()
  finishPlayback()
}

function scheduleBassAt(
  barStartTime: number,
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
    const pattern = buildBassPatternNotes(chordSymbol, 2)
    const note = pattern?.[beat % 8]

    if (!note) {
      continue
    }

    activeTransportEvents.push(
      Tone.Transport.scheduleOnce(() => {
        bassInstrument.triggerAttackRelease(
          note,
          Math.max(0.1, beatDuration * 0.25),
          undefined,
          0.56,
        )
      }, barStartTime + beat * beatDuration),
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

function scheduleBarDrumsAt(barStartTime: number, beatDuration: number) {
  const kit = getDrumKit()

  for (let beat = 0; beat < 4; beat += 1) {
    activeTransportEvents.push(
      Tone.Transport.scheduleOnce(() => {
        kit.kick.triggerAttackRelease('C1', '8n', undefined, 0.85)

        if (beat === 1 || beat === 3) {
          kit.snare.triggerAttackRelease('16n', undefined, 0.42)
        }
      }, barStartTime + beat * beatDuration),
    )
  }

  for (let step = 0; step < 8; step += 1) {
    activeTransportEvents.push(
      Tone.Transport.scheduleOnce(() => {
        kit.hiHat.triggerAttackRelease('32n', undefined, 0.15)
      }, barStartTime + step * beatDuration * 0.5),
    )
  }
}

function buildRolledChordEvents(
  notes: string[],
  chordStartTime: number,
  chordDuration: number,
  chordSlotSeconds: number,
  velocity: number,
) {
  const rolledNotes = [...notes]
  const tonicUp = raiseNoteOctave(notes[0] ?? '', 1)
  if (tonicUp) {
    rolledNotes.push(tonicUp)
  }

  const maxNotes = 10
  const limitedNotes = rolledNotes.length > maxNotes ? rolledNotes.slice(0, maxNotes) : rolledNotes

  if (limitedNotes.length === 0) {
    return [] as Array<{ time: number; note: string; duration: number; velocity: number }>
  }

  const totalSpreadSeconds = Math.max(0, Math.min(chordSlotSeconds / 8, chordDuration * 0.6))
  const stepSeconds = limitedNotes.length > 1 ? totalSpreadSeconds / (limitedNotes.length - 1) : 0

  return limitedNotes.map((note, index) => {
    const offset = index * stepSeconds
    const maxInsideSlot = Math.max(0.06, chordSlotSeconds - offset - 0.01)
    const noteDuration = Math.max(
      0.06,
      Math.min(chordDuration * 0.78 - offset * 0.85, maxInsideSlot),
    )
    const noteVelocity = Math.max(0.05, velocity - index * 0.02)

    return {
      time: chordStartTime + offset,
      note,
      duration: noteDuration,
      velocity: noteVelocity,
    }
  })
}

function raiseNoteOctave(note: string, octaves: number) {
  // Expected format: <pitchClass><octave>, e.g. C4, Db3, F#5
  const match = /^([A-G](?:#|b)?)(-?\d+)$/.exec(note)
  if (!match) return null

  const [, pitchClass, octaveText] = match
  const octave = Number(octaveText)
  if (!Number.isFinite(octave)) return null

  return `${pitchClass}${octave + octaves}`
}

async function prepareAudio() {
  const context = Tone.getContext()

  context.lookAhead = 0.12
  Tone.Destination.volume.value = -4
  await Tone.start()

  if (context.state === 'suspended') {
    await context.resume()
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
