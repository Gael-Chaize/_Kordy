export const previewFontSizes = [8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36]
export const defaultPreviewFontSize = 22
export const defaultSectionFontSize = 20
export const defaultHeaderFontSize = 32
export type PreviewFontField = 'chordFontSize' | 'lyricsFontSize' | 'sectionFontSize' | 'headerFontSize'
export const previewFontDefaults: Record<PreviewFontField, number> = {
  chordFontSize: defaultPreviewFontSize,
  lyricsFontSize: defaultPreviewFontSize,
  sectionFontSize: defaultSectionFontSize,
  headerFontSize: defaultHeaderFontSize,
}
export const defaultChordColor = '#2457c5'
export const defaultGridColor = '#808080'
