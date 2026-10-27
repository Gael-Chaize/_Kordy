import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Bar, Section, Song } from '../music/types'
import { transposeBar } from '../music/transpose'
import { defaultPreviewFontSize, defaultSectionFontSize, defaultHeaderFontSize, defaultChordColor, defaultGridColor } from '../music/previewSettings'
import { FittedLyrics } from './FittedLyrics'

type PrintPreviewProps = {
  song: Song
  activeBarId: string | null
  activeSectionId: string | null
  activeChord: { barId: string; chordIndex: number | null } | null
  fitToA4?: boolean
  onPageCountChange?: (count: number) => void
  onPrintReady?: () => void
}

type Fragment = { section: Section; lines: Bar[][]; continued: boolean }
type Page = Fragment[]

export function PrintPreview(props: PrintPreviewProps) {
  const { song, fitToA4 = false, onPageCountChange, onPrintReady } = props
  const measurement = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<Page[]>([])
  useEffect(() => {
    if (!fitToA4 || !pages.length || !onPrintReady) return
    let cancelled = false
    let frame = 0
    void document.fonts.ready.then(() => {
      frame = requestAnimationFrame(() => { if (!cancelled) onPrintReady() })
    })
    return () => { cancelled = true; cancelAnimationFrame(frame) }
  }, [fitToA4, pages, onPrintReady])
  const style = {
    '--preview-chord-size': `${song.chordFontSize ?? defaultPreviewFontSize}px`,
    '--preview-lyrics-size': `${song.lyricsFontSize ?? defaultPreviewFontSize}px`,
    '--preview-section-size': `${song.sectionFontSize ?? defaultSectionFontSize}px`,
    '--preview-header-size': `${song.headerFontSize ?? defaultHeaderFontSize}px`,
    '--preview-chord-weight': song.chordBold === false ? 400 : 800,
    '--preview-chord-color': song.chordColor ?? defaultChordColor,
    '--preview-grid-color': song.gridColor ?? defaultGridColor,
    '--preview-lyrics-weight': song.lyricsBold === false ? 400 : 800,
  } as CSSProperties

  useEffect(() => {
    if (!fitToA4 || !measurement.current) return
    const node = measurement.current
    const measure = () => {
      const article = node.querySelector<HTMLElement>('.print-preview')!
      if (!article.clientHeight) return
      const header = node.querySelector<HTMLElement>('.print-chart-header')!
      const sections = node.querySelector<HTMLElement>('.print-sections')!
      const css = getComputedStyle(article)
      const headerCss = getComputedStyle(header)
      const capacity = article.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom)
        - header.offsetHeight - parseFloat(headerCss.marginBottom)
      const gap = parseFloat(getComputedStyle(sections).rowGap) || 0
      const sectionNodes = [...sections.querySelectorAll<HTMLElement>('.print-section')]
      const nextPages: Page[] = [[]]
      let used = 0
      const nextPage = () => { nextPages.push([]); used = 0 }
      const add = (fragment: Fragment, height: number) => {
        const page = nextPages[nextPages.length - 1]
        used += (page.length ? gap : 0) + height
        page.push(fragment)
      }

      song.sections.forEach((section, index) => {
        const element = sectionNodes[index]
        const heading = element.querySelector<HTMLElement>('.print-section-header')!
        const headingHeight = heading.offsetHeight + parseFloat(getComputedStyle(heading).marginBottom)
        const rows = [...element.querySelectorAll<HTMLElement>('.print-bar-grid')]
        // Reserve a top border when a row starts a new page fragment.
        const heights = rows.map((row, rowIndex) => row.offsetHeight + (rowIndex ? 2 : 0))
        const lines = chunkBars(section.bars)
        const wholeHeight = headingHeight + heights.reduce((sum, height) => sum + height, 0)
        if (wholeHeight <= capacity || lines.length === 0) {
          if (used && used + gap + wholeHeight > capacity) nextPage()
          add({ section, lines, continued: false }, wholeHeight)
          return
        }

        let start = 0
        while (start < lines.length) {
          if (used && used + gap + headingHeight + heights[start] > capacity) nextPage()
          let height = headingHeight
          let end = start
          const spacing = used ? gap : 0
          while (end < lines.length && used + spacing + height + heights[end] <= capacity) {
            height += heights[end++]
          }
          // A single line is the smallest unbreakable unit.
          if (end === start) { height += heights[end]; end++ }
          add({ section, lines: lines.slice(start, end), continued: start > 0 }, height)
          start = end
          if (start < lines.length) nextPage()
        }
      })
      setPages(nextPages)
      onPageCountChange?.(nextPages.length)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    node.querySelectorAll('.print-chart-header, .print-section-header, .print-bar-grid').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [song, fitToA4, onPageCountChange])

  const fullSections = song.sections.map(section => ({ section, lines: chunkBars(section.bars), continued: false }))
  const renderPage = (fragments: Page, pageIndex?: number, total?: number, measuring = false) => (
    <article className={`print-preview${fitToA4 ? ' a4-page' : ''}`}
      aria-label={pageIndex === undefined ? 'Printable chord chart preview' : `Page ${pageIndex + 1} of ${total}`}
      style={style}>
      <ChartHeader song={song} />
      <div className="print-sections">
        {fragments.map(({ section, lines, continued }) => (
          <section className="print-section" key={section.id} data-print-section-id={section.id}>
            <div className="print-section-header">
              <h2 className={!measuring && props.activeSectionId === section.id ? 'playing-section-title' : ''}>
                {section.name}{continued && <small className="section-continuation"> (continued)</small>}
              </h2>
              {section.repeatCount > 1 && <span>Repeat x{section.repeatCount}</span>}
            </div>
            <div className="print-bar-lines">
              {lines.map(line => (
                <div className="print-bar-grid" key={line[0].id}>
                  {line.map(bar => <PreviewBar key={bar.id} bar={bar} {...props} measuring={measuring} />)}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      {pageIndex !== undefined && <footer className="a4-page-number">{pageIndex + 1} / {total}</footer>}
    </article>
  )

  if (!fitToA4) return renderPage(fullSections)
  return (
    <>
      <div ref={measurement} className="a4-measure" aria-hidden="true" inert>
        {renderPage(fullSections, undefined, undefined, true)}
      </div>
      <div className="a4-pages">
        {pages.map((fragments, index) => <div className="a4-page-frame" key={index}>{renderPage(fragments, index, pages.length)}</div>)}
      </div>
    </>
  )
}

function ChartHeader({ song }: { song: Song }) {
  return (
    <header className="print-chart-header">
      <div className="print-chart-meta">
        <div className="print-title-row"><div>
          <h1>{song.title}</h1>
          <p className="print-artist">{song.artist}</p>
        </div></div>
      </div>
      <div className="print-right-meta">
        <p className="print-style">{song.style}</p>
        <p className="print-tempo">Tempo: {song.tempo}</p>
      </div>
    </header>
  )
}

function PreviewBar({ bar, song, activeBarId, activeChord, measuring }: PrintPreviewProps & { bar: Bar; measuring: boolean }) {
  const tokens = transposeBar(bar.chord, song.transpose ?? 0).trim().split(/\s*\|\s*|\s+/).filter(Boolean)
  if (!tokens.length) tokens.push('%')
  return (
    <div className={`print-bar-cell${!measuring && bar.id === activeBarId ? ' active-bar' : ''}`} data-print-bar-id={bar.id}>
      <FittedLyrics text={bar.lyrics ?? ''} fontSize={song.lyricsFontSize ?? defaultPreviewFontSize} bold={song.lyricsBold !== false} />
      <span className={`print-chords print-chord-count-${tokens.length}`}>
        {tokens.map((chord, index) => (
          <span key={index} className="print-chord-slot">
            {index > 0 && (
              <span className="print-chord-separator" aria-hidden="true">|</span>
            )}
            <span className={`print-chord-symbol${!measuring && activeChord?.barId === bar.id && activeChord.chordIndex === index ? ' current-chord-text' : ''}`}>{chord}</span>
          </span>
        ))}
      </span>
    </div>
  )
}

function chunkBars(bars: Bar[]) {
  const chunks: Bar[][] = []
  for (let index = 0; index < bars.length; index += 4) chunks.push(bars.slice(index, index + 4))
  return chunks
}
