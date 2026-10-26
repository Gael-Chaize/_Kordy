import { useEffect, useRef, useState, type ReactNode } from 'react'

export function A4Preview({ children }: { children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState({ scale: 1, height: 0 })

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const available = viewport.current!.clientWidth
      const paper = sheet.current!
      const scale = Math.min(1, available / paper.offsetWidth)
      const height = paper.offsetHeight * scale
      setLayout(current => current.scale === scale && current.height === height ? current : { scale, height })
    })
    observer.observe(viewport.current!)
    observer.observe(sheet.current!)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={viewport} className="a4-preview" style={{ height: layout.height || undefined }}>
      <div ref={sheet} className="a4-sheet" style={{ transform: `scale(${layout.scale})` }}>
        {children}
      </div>
    </div>
  )
}
