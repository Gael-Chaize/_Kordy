# Chord input (quick reference)

## Bar (cell) format

- Write up to **4 chord symbols** per bar.
- Separate chords with **spaces** or `|` (the app normalizes to `A | B | C`).
- Use `%` to repeat the previous chord in the bar/line.
  - Example: `Fm7 | % | Eb7 | %`

## Chord symbol format

### Root

- English: `C D E F G A B`
- French solfège: `do ré re mi fa sol la si`
- Accidentals (root): `#` or `b`
  - Examples: `F#`, `Db`, `Sib`, `Fa#`

### Qualities supported

- Major: `C`, `CM`, `Cmaj`
- Minor: `Cm`, `C-`, `Cmin`
- Power chord: `C5`
- Dominant / extensions: `C7`, `C9`, `C11`, `C13`
- Major extensions: `Cmaj7`, `CM7`, `Cmaj9`, `CM11`, `CM13`
- Minor extensions: `Cm7`, `Cm9`, `Cm11`, `Cm13`
- Minor-major (m + major 7): `Cmmaj7`, `Cminmaj9`, `Cminmaj13`
- 6 chords: `C6`, `Cm6`
- Half-diminished: `Cm7b5`
- Diminished: `Cdim`
- Augmented: `Caug`, `C+`
- Suspended: `Csus2`, `Csus4`, `Csus`
- Dominant sus: `C7sus4`, `C7sus2`, `C7sus`

### Slash bass

- Supported: `C/E`, `Bb/D`, `Cmaj7/G`

### Modifiers / tensions

Put “ambiguous” extensions/alterations in parentheses:

- Examples: `G7(b9)`, `G7(#9)`, `Cmaj7(#11)`, `G7(b5#9)`

You can also use `6/9` without parentheses:

- `C6/9` (interpreted as `C6(9)`)
- With bass too: `C6/9/E`

### add / alt (outside parentheses)

- `Cadd9`, `CM7add13`, `Cmadd9`
- With accidentals: `Caddb9`, `Cadd#11`
- `G7alt` and `Galt` (shorthand altered dominant colour)

## Ambiguity rules (important)

- `Gb9` means **G♭ 9** (root is G♭).
- If you mean **G with a ♭9**, write `G(b9)` (or `G7(b9)`).
- `G #11` is accepted and rewritten as `G(#11)` (no spaces kept).

## Not supported (yet)

- Unicode accidentals: `♭`, `♯`, `ø`, `°`
- Double accidentals: `bb`, `##`
- `no3`, `omit5`, `add#11` (only `add<number>` is supported)
