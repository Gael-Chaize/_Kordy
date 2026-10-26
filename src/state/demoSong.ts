import type { Song } from '../music/types'

export const demoSong: Song = {
  title: 'Song for my father (Horace Silver)',
  artist: 'Horace Silver',
  style: 'Hard bop',
  tempo: 118,
  sections: [
    {
      id: 'demo-a',
      name: 'A',
      repeatCount: 1,
      bars: [
        { id: 'demo-a-1', chord: 'Fm7' },
        { id: 'demo-a-2', chord: '%' },
        { id: 'demo-a-3', chord: 'Eb7' },
        { id: 'demo-a-4', chord: '%' },
        { id: 'demo-a-5', chord: 'Db7' },
        { id: 'demo-a-6', chord: '% | C7' },
        { id: 'demo-a-7', chord: 'Fm7' },
        { id: 'demo-a-8', chord: '%' },
      ],
    },
    {
      id: 'demo-b',
      name: 'B',
      repeatCount: 1,
      bars: [
        { id: 'demo-b-1', chord: 'Eb7' },
        { id: 'demo-b-2', chord: '%' },
        { id: 'demo-b-3', chord: 'Fm7' },
        { id: 'demo-b-4', chord: '%' },
        { id: 'demo-b-5', chord: 'Eb7 | Db7' },
        { id: 'demo-b-6', chord: '% | C7' },
        { id: 'demo-b-7', chord: 'Fm7' },
        { id: 'demo-b-8', chord: '%' },
      ],
    },
  ],
}


