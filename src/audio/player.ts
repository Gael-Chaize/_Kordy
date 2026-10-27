import * as Tone from 'tone'
import { createBassInstrument, createPianoInstrument, type BassInstrument, type ChordInstrument, type PianoSound } from './instruments'
import { buildBarChordNotes, buildBassPatternNotes } from '../music/chords'
import type { Song } from '../music/types'
import { getPlaybackBars } from '../music/playbackSections'
import { transposeNote } from '../music/transpose'

const pianoInstruments = new Map<PianoSound, ChordInstrument>()
let bass: BassInstrument | null = null
let kick: Tone.MembraneSynth | null = null
let snare: Tone.NoiseSynth | null = null
let hiHat: Tone.NoiseSynth | null = null
let activeTransportEvents: number[] = []
let resolvePlayback: (() => void) | null = null
let generation = 0
let previewGeneration = 0
let playing = false
let tempoTimer: number | undefined
let finishTimer: number | undefined

type PlaybackSettings = {
  drumsEnabled: boolean
  bassEnabled?: boolean
  pianoSound?: PianoSound
}

type PlaybackOptions = PlaybackSettings & {
  getSettings?: () => PlaybackSettings
  startBarId?: string
  loopBarCount?: number
  loopSectionId?: string
  onBarStart?: (barId: string) => void
  onSectionStart?: (sectionId: string) => void
  onChordStart?: (barId: string, chordIndex: number | null) => void
  getTempo?: () => number
}

function validTempo(value: number) {
  return Number.isFinite(value) ? Math.max(30, Math.min(260, value)) : 120
}

function beatTime(beat: number) {
  return `${beat * Tone.Transport.PPQ}i`
}

function beatSeconds(beats: number) {
  return beats * 60 / Tone.Transport.bpm.value
}

export async function playSong(song: Song, options: PlaybackOptions = { drumsEnabled: false }) {
  // Invalidate pending starts before awaiting AudioContext permission/resumption.
  stopSong()
  const request = generation
  const allBars = getPlaybackBars(song)
  if (!allBars.length) return
  const sourceSection = song.sections.find(section => section.bars.some(bar => bar.id === options.startBarId))
  const requestedStartIndex = options.loopSectionId !== undefined
    ? allBars.findIndex(entry => entry.sectionId === options.loopSectionId)
    : options.startBarId !== undefined
      ? allBars.findIndex(entry => entry.bar.id === options.startBarId && entry.sectionId === sourceSection?.id)
      : 0
  if (requestedStartIndex < 0) return
  const startIndex = requestedStartIndex
  const sectionLoopCount = options.loopSectionId === undefined ? undefined
    : allBars.filter(entry => entry.sectionId === options.loopSectionId).length
  const count = options.loopBarCount ?? sectionLoopCount ?? (allBars.length - startIndex)
  const entries = allBars.slice(startIndex, Math.min(startIndex + count, allBars.length))
  if (!entries.length) return

  await prepareAudio()
  if (generation !== request) return
  let settings = options.getSettings?.() ?? options
  let sound = settings.pianoSound ?? 'dx7'
  let piano = getSynth(sound)
  let bassInstrument = settings.bassEnabled ? getBass() : null
  let previousChord: string | null = null
  const playbacks = allBars.map(({ bar }) => {
    const playback = buildBarChordNotes(bar.chord, previousChord)
    if (playback) previousChord = playback.lastResolvedChord
    return playback
  }).slice(startIndex, startIndex + entries.length)
  const schedule = (beat: number, callback: (time: number) => void) => {
    activeTransportEvents.push(Tone.Transport.schedule(time => {
      if (generation === request) callback(time)
    }, beatTime(beat)))
  }
  const draw = (time: number, callback: () => void) => {
    Tone.Draw.schedule(() => { if (generation === request) callback() }, time)
  }
  Tone.Transport.bpm.value = validTempo(options.getTempo?.() ?? song.tempo)
  Tone.Transport.loopStart = 0
  Tone.Transport.seconds = 0
  Tone.Transport.loop = options.loopBarCount !== undefined || options.loopSectionId !== undefined
  Tone.Transport.loopEnd = beatTime(entries.length * 4)
  playing = true

  entries.forEach(({ bar, sectionId }, index) => {
    const barBeat = index * 4
    const playback = playbacks[index]
    schedule(barBeat, time => {
      // Latch all requested accompaniment changes together at the bar boundary.
      const next = options.getSettings?.() ?? options
      const nextSound = next.pianoSound ?? 'dx7'
      if (nextSound !== sound) {
        piano.releaseAll(time)
        piano = getSynth(nextSound)
        sound = nextSound
      }
      if (settings.bassEnabled && !next.bassEnabled) bassInstrument?.releaseAll(time)
      settings = { ...next }
      if (settings.bassEnabled) bassInstrument = getBass()
      if (settings.drumsEnabled) getDrumKit()
      draw(time, () => {
        options.onBarStart?.(bar.id)
        options.onSectionStart?.(sectionId)
        options.onChordStart?.(bar.id, null)
      })
    })
      for (let beat = 0; beat < 4; beat++) {
        schedule(barBeat + beat, time => {
          if (!settings.drumsEnabled) return
          const kit = getDrumKit()
          kit.kick.triggerAttackRelease('C1', '8n', time, 0.85)
          if (beat === 1 || beat === 3) kit.snare.triggerAttackRelease('16n', time, 0.42)
        })
      }
      for (let step = 0; step < 8; step++) {
        schedule(barBeat + step / 2, time => {
          if (settings.drumsEnabled) getDrumKit().hiHat.triggerAttackRelease('32n', time, 0.15)
        })
      }
    if (!playback) return
      for (let beat = 0; beat < 4; beat++) {
        const chordIndex = playback.chordSymbols.length === 2 ? Math.floor(beat / 2)
          : Math.min(beat, playback.chordSymbols.length - 1)
        const slotStart = playback.chordSymbols.length === 1 ? 0
          : playback.chordSymbols.length === 2 ? chordIndex * 2 : chordIndex
        const note = buildBassPatternNotes(playback.chordSymbols[chordIndex], 2)?.[beat - slotStart]
        if (note) schedule(barBeat + beat, time => {
          if (settings.bassEnabled) bassInstrument?.triggerAttackRelease(transposeNote(note, song.transpose ?? 0), Math.max(0.1, beatSeconds(0.25)), time, 0.56)
        })
      }
    playback.notes.forEach((notes, chordIndex) => {
      if (!notes) return
      const start = playback.notes.length === 2 ? chordIndex * 2 : chordIndex
      const end = chordIndex === playback.notes.length - 1 ? 4
        : playback.notes.length === 2 ? start + 2 : start + 1
      const slotBeats = end - start
      schedule(barBeat + start, time => draw(time, () => options.onChordStart?.(bar.id, chordIndex)))
      // Plan in musical beats; convert envelopes to seconds only when a note fires.
      const events = buildRolledChordEvents(notes.map(note => transposeNote(note, song.transpose ?? 0)), barBeat + start, 1, slotBeats, 0.62)
      for (const event of events) {
        schedule(event.time, time => piano.triggerAttackRelease(event.note, beatSeconds(event.duration), time, event.velocity))
      }
    })
  })

  const completion = new Promise<void>(resolve => { resolvePlayback = resolve })
  if (!Tone.Transport.loop) {
    activeTransportEvents.push(Tone.Transport.scheduleOnce(time => {
      if (generation !== request) return
      Tone.Transport.stop(time)
      pianoInstruments.forEach(instrument => instrument.releaseAll(time))
      bassInstrument?.releaseAll(time)
      // Resolve at the audible end, rather than when the look-ahead scheduler fires.
      finishTimer = window.setTimeout(() => {
        if (generation === request) finishPlayback()
      }, Math.max(0, time - Tone.immediate()) * 1000)
    }, beatTime(entries.length * 4)))
  }
  if (options.getTempo) {
    tempoTimer = window.setInterval(() => {
      if (generation !== request) return
      const tempo = validTempo(options.getTempo!())
      if (tempo !== Tone.Transport.bpm.value) Tone.Transport.bpm.value = tempo
    }, 50)
  }
  Tone.Transport.start('+0.05')
  return completion
}

export async function previewChord(chordText: string, pianoSound: PianoSound) {
  if (playing) return
  const request = generation
  const preview = ++previewGeneration
  await prepareAudio()
  if (playing || generation !== request || preview !== previewGeneration) return
  const playback = buildBarChordNotes(chordText)
  if (!playback?.notes[0]) return
  const instrument = getSynth(pianoSound)
  instrument.releaseAll()
  const startTime = Tone.now() + 0.02
  for (const event of buildRolledChordEvents(playback.notes[0], 0, 0.5, 0.5, 0.52)) {
    instrument.triggerAttackRelease(event.note, event.duration, startTime + event.time, event.velocity)
  }
}

function finishPlayback() {
  window.clearInterval(tempoTimer)
  window.clearTimeout(finishTimer)
  tempoTimer = undefined
  finishTimer = undefined
  playing = false
  Tone.Transport.stop(Tone.immediate())
  activeTransportEvents.forEach(id => Tone.Transport.clear(id))
  activeTransportEvents = []
  Tone.Draw.cancel(0)
  const resolve = resolvePlayback
  resolvePlayback = null
  resolve?.()
}

export function stopSong() {
  generation++
  previewGeneration++
  finishPlayback()
  Tone.Transport.cancel(0)
  Tone.Transport.loop = false
  // Disposing also cancels attacks already queued inside the audio look-ahead.
  pianoInstruments.forEach(instrument => instrument.dispose())
  pianoInstruments.clear()
  bass?.dispose()
  kick?.dispose()
  snare?.dispose()
  hiHat?.dispose()
  bass = null
  kick = null
  snare = null
  hiHat = null
}

function buildRolledChordEvents(notes: string[], chordStartTime: number, chordDuration: number, chordSlotSeconds: number, velocity: number) {
  const rolledNotes = [...notes]
  const tonicUp = raiseNoteOctave(notes[0] ?? '', 1)
  if (tonicUp && !rolledNotes.includes(tonicUp)) rolledNotes.push(tonicUp)
  const limitedNotes = rolledNotes.slice(0, 10)
  const spread = Math.max(0, Math.min(chordSlotSeconds / 8, chordDuration * 0.6))
  const step = limitedNotes.length > 1 ? spread / (limitedNotes.length - 1) : 0
  return limitedNotes.map((note, index) => {
    const offset = index * step
    return {
      time: chordStartTime + offset,
      note,
      duration: Math.max(0.06, Math.min(chordDuration * 0.78 - offset * 0.85, Math.max(0.06, chordSlotSeconds - offset - 0.01))),
      velocity: Math.max(0.05, velocity - index * 0.02),
    }
  })
}

function raiseNoteOctave(note: string, octaves: number) {
  const match = /^([A-G](?:#|b)?)(-?\d+)$/.exec(note)
  return match ? `${match[1]}${Number(match[2]) + octaves}` : null
}

async function prepareAudio() {
  const context = Tone.getContext()
  context.lookAhead = 0.12
  Tone.Destination.volume.value = -4
  await Tone.start()
  if (context.state === 'suspended') await context.resume()
}

function getSynth(sound: PianoSound) {
  let instrument = pianoInstruments.get(sound)
  if (!instrument) {
    instrument = createPianoInstrument(sound)
    pianoInstruments.set(sound, instrument)
  }
  return instrument
}

function getBass() {
  if (!bass) bass = createBassInstrument()
  return bass
}

function getDrumKit() {
  if (!kick) {
    kick = new Tone.MembraneSynth({ pitchDecay: 0.04, octaves: 6,
      envelope: { attack: 0.001, decay: 0.35, sustain: 0.01, release: 0.15 } }).toDestination()
    kick.volume.value = -5
  }
  if (!snare) {
    snare = new Tone.NoiseSynth({ noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.08 } }).toDestination()
    snare.volume.value = -12
  }
  if (!hiHat) {
    hiHat = new Tone.NoiseSynth({ noise: { type: 'brown' },
      envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.015 } }).toDestination()
    hiHat.volume.value = -22
  }
  return { kick, snare, hiHat }
}
