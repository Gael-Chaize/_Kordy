import type { Bar, Section, Song } from './types'

// Empty sections can refer to other sections. Cycles and missing targets are silent.
export function resolveSectionBars(song: Song, section: Section, visited = new Set<string>()): Bar[] {
  if (visited.has(section.id)) return []
  const path = new Set(visited).add(section.id)
  const target = section.playbackSectionId
    ? song.sections.find(item => item.id === section.playbackSectionId) : undefined
  const bars = section.bars.length > 0 ? section.bars
    : target ? resolveSectionBars(song, target, path) : []
  return Array.from({ length: section.repeatCount }, () => bars).flat()
}

export function getPlaybackBars(song: Song) {
  return song.sections.flatMap(section =>
    resolveSectionBars(song, section).map(bar => ({ bar, sectionId: section.id })),
  )
}

export function canReferenceSection(song: Song, fromId: string, targetId: string) {
  const visited = new Set([fromId])
  let target = song.sections.find(section => section.id === targetId)
  while (target) {
    if (visited.has(target.id)) return false
    visited.add(target.id)
    if (target.bars.length > 0 || !target.playbackSectionId) return true
    const nextId = target.playbackSectionId
    target = song.sections.find(section => section.id === nextId)
  }
  return false
}
