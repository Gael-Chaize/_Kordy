export type Bar = {
  id: string
  chord: string
}

export type Section = {
  id: string
  name: string
  repeatCount: number
  bars: Bar[]
}

export type Song = {
  title: string
  tempo: number
  sections: Section[]
}
