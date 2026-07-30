/**
 * A half-open `[start, end)` range of UTF-16 offsets in the preserved source.
 *
 * An empty span identifies an insertion point, which is useful for diagnostics
 * about missing syntax.
 */
export type SourceSpan = Readonly<{
  start: number
  end: number
}>

/** A source-associated failure that can cross domain and UI boundaries. */
export type Diagnostic = Readonly<{
  code: string
  severity: 'error'
  message: string
  span: SourceSpan
}>
