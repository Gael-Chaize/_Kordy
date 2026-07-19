import * as Tone from 'tone'

export type PianoSound = 'piano' | 'dx7' | 'rhodes' | 'bell'

export const pianoSoundOptions: Array<{ value: PianoSound; label: string }> = [
  { value: 'dx7', label: 'EP (DX7)' },
  { value: 'rhodes', label: 'Rhodes' },
  { value: 'bell', label: 'Bell' },
  { value: 'piano', label: 'Piano' },
]

export type ChordInstrument = {
  triggerAttackRelease: (
    notes: string[] | string,
    duration: number,
    time?: Tone.Unit.Time,
    velocity?: number,
  ) => void
  releaseAll: (time?: Tone.Unit.Time) => void
  dispose: () => void
}

export type BassInstrument = {
  triggerAttackRelease: (
    note: string,
    duration: number,
    time?: Tone.Unit.Time,
    velocity?: number,
  ) => void
  releaseAll: () => void
  dispose: () => void
}

export function createPianoInstrument(sound: PianoSound): ChordInstrument {
  switch (sound) {
    case 'dx7':
      return createDx7Ep()
    case 'rhodes':
      return createRhodes()
    case 'bell':
      return createBell()
    case 'piano':
      return createBasicPiano()
  }
}

export function createBassInstrument(): BassInstrument {
  const instrument = new Tone.MonoSynth({
    oscillator: {
      type: 'triangle',
    },
    portamento: 0.016,
    filter: {
      type: 'lowpass',
      frequency: 780,
      rolloff: -24,
    },
    envelope: {
      attack: 0.028,
      decay: 0.12,
      sustain: 0.92,
      release: 0.38,
    },
    filterEnvelope: {
      attack: 0.03,
      decay: 0.22,
      sustain: 0.08,
      release: 0.22,
      baseFrequency: 140,
      octaves: 1.15,
    },
  })
  const drive = new Tone.Distortion(0.14)
  const compressor = new Tone.Compressor(-18, 4)
  const limiter = new Tone.Limiter(-3)

  instrument.volume.value = isMobileAudioDevice() ? -13 : -10
  instrument.chain(drive, compressor, limiter, Tone.Destination)

  return {
    triggerAttackRelease(note, duration, time, velocity) {
      instrument.triggerAttackRelease(note, duration, time, velocity)
    },
    releaseAll() {
      instrument.triggerRelease()
    },
    dispose() {
      instrument.dispose()
      drive.dispose()
      compressor.dispose()
      limiter.dispose()
    },
  }
}

function createDx7Ep() {
  const instrument = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 3.01,
    modulationIndex: 14,
    oscillator: {
      type: 'sine',
    },
    envelope: {
      attack: 0.006,
      decay: 0.45,
      sustain: 0.18,
      release: 1.15,
    },
    modulation: {
      type: 'sine',
    },
    modulationEnvelope: {
      attack: 0.005,
      decay: 0.32,
      sustain: 0.08,
      release: 0.7,
    },
  })

  instrument.maxPolyphony = getMaxPolyphony()
  instrument.volume.value = -12

  return connectInstrument(instrument, {
    chorusDepth: 0.38,
    reverbDecay: 1.8,
    wet: 0.16,
  })
}

function createRhodes() {
  const instrument = new Tone.PolySynth(Tone.AMSynth, {
    harmonicity: 1.8,
    oscillator: {
      type: 'sine',
    },
    envelope: {
      attack: 0.018,
      decay: 0.5,
      sustain: 0.28,
      release: 1.25,
    },
    modulation: {
      type: 'sine',
    },
    modulationEnvelope: {
      attack: 0.02,
      decay: 0.3,
      sustain: 0.2,
      release: 0.9,
    },
  })

  instrument.maxPolyphony = getMaxPolyphony()
  instrument.volume.value = -10

  return connectInstrument(instrument, {
    chorusDepth: 0.24,
    reverbDecay: 1.45,
    wet: 0.13,
  })
}

function createBell() {
  const instrument = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 5.1,
    modulationIndex: 22,
    oscillator: {
      type: 'sine',
    },
    envelope: {
      attack: 0.003,
      decay: 0.7,
      sustain: 0.04,
      release: 1.7,
    },
    modulation: {
      type: 'sine',
    },
    modulationEnvelope: {
      attack: 0.001,
      decay: 0.45,
      sustain: 0,
      release: 0.8,
    },
  })

  instrument.maxPolyphony = getMaxPolyphony()
  instrument.volume.value = -15

  return connectInstrument(instrument, {
    chorusDepth: 0.12,
    reverbDecay: 2.3,
    wet: 0.22,
  })
}

function createBasicPiano() {
  const instrument = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: 'triangle',
    },
    envelope: {
      attack: 0.012,
      decay: 0.24,
      sustain: 0.24,
      release: 0.95,
    },
  })

  instrument.maxPolyphony = getMaxPolyphony()
  instrument.volume.value = -10

  return connectInstrument(instrument, {
    chorusDepth: 0.08,
    reverbDecay: 1.25,
    wet: 0.1,
  })
}

function connectInstrument(
  instrument: Tone.PolySynth,
  options: { chorusDepth: number; reverbDecay: number; wet: number },
): ChordInstrument {
  if (isMobileAudioDevice()) {
    const compressor = new Tone.Compressor(-24, 4)
    const limiter = new Tone.Limiter(-3)

    instrument.chain(compressor, limiter, Tone.Destination)

    return {
      triggerAttackRelease(notes, duration, time, velocity) {
        instrument.triggerAttackRelease(notes, duration, time, velocity)
      },
      releaseAll(time) {
        instrument.releaseAll(time)
      },
      dispose() {
        instrument.dispose()
        compressor.dispose()
        limiter.dispose()
      },
    }
  }

  const chorus = new Tone.Chorus(1.4, 1.9, options.chorusDepth).start()
  const reverb = new Tone.Reverb({
    decay: options.reverbDecay,
    wet: options.wet,
  })
  const compressor = new Tone.Compressor(-22, 3)

  instrument.chain(chorus, reverb, compressor, Tone.Destination)

  return {
    triggerAttackRelease(notes, duration, time, velocity) {
      instrument.triggerAttackRelease(notes, duration, time, velocity)
    },
    releaseAll(time) {
      instrument.releaseAll(time)
    },
    dispose() {
      instrument.dispose()
      chorus.dispose()
      reverb.dispose()
      compressor.dispose()
    },
  }
}

function getMaxPolyphony() {
  return isMobileAudioDevice() ? 12 : 24
}

function isMobileAudioDevice() {
  if (typeof navigator === 'undefined') {
    return false
  }

  const userAgent = navigator.userAgent.toLowerCase()

  return /android|iphone|ipad|ipod/.test(userAgent)
}
