import { useEffect, useRef } from 'react'

type Props = { text: string; fontSize: number; bold: boolean }

export function FittedLyrics({ text, fontSize, bold }: Props) {
  const element = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const node = element.current!
    const context = document.createElement('canvas').getContext('2d')!
    let active = true
    const fit = () => {
      if (!active) return
      const css = getComputedStyle(node)
      context.font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`
      const displayedText = text.replace(/\s+/g, ' ').trim()
      const naturalWidth = context.measureText(displayedText).width
      const characters = [...displayedText].length
      const requiredSpacing = characters ? (node.clientWidth - naturalWidth - 0.5) / characters : 0
      const maxTightening = parseFloat(css.fontSize) * 0.035
      // Only rescue a near fit; don't squash long phrases or change the font size.
      node.style.letterSpacing = naturalWidth > node.clientWidth && requiredSpacing >= -maxTightening
        ? `${Math.min(0, requiredSpacing)}px` : '0px'
    }
    const observer = new ResizeObserver(fit)
    observer.observe(node)
    void document.fonts.ready.then(fit)
    return () => { active = false; observer.disconnect() }
  }, [text, fontSize, bold])

  return <span ref={element} className="print-lyrics">{text}</span>
}
