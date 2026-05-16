import helpText from '../help/chords-help.md?raw'
import './HelpView.css'

export function HelpView() {
  return (
    <section className="help-view" aria-label="Help">
      <header className="help-header">
        <h2>Help</h2>
        <p>Chord input reference (what the editor accepts).</p>
      </header>
      <pre className="help-content">{helpText}</pre>
    </section>
  )
}

