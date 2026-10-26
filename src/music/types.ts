export type Bar = {
  id: string
  chord: string
  lyrics?: string
}

export type Section = {
  id: string
  name: string
  repeatCount: number
  bars: Bar[]
  playbackSectionId?: string
}

export type Song = {
  transpose?: number
  chordFontSize?: number
  lyricsFontSize?: number
  sectionFontSize?: number
  headerFontSize?: number
  chordBold?: boolean
  lyricsBold?: boolean
  chordColor?: string
  gridColor?: string
  title: string
  artist: string
  style: string
  tempo: number
  sections: Section[]
}
