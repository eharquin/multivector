import { parseDocumentExpression } from './parseExpression'

const NUMERIC_LITERAL = '[+-]?\\s*(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]\\d+)?'
const DIRECT_LITERAL = new RegExp(
  `^(?:\\s*\\(\\s*)*(${NUMERIC_LITERAL})(?:\\s*\\)\\s*)*$`,
)

export type DirectScalarEdit = Readonly<{
  name: string
  span: Readonly<{ start: number; end: number }>
  value: number
}>

/** Finds the smallest language-owned span for a direct declared scalar literal. */
export function directScalarEdit(source: string): DirectScalarEdit | null {
  const parsed = parseDocumentExpression(source)
  if (!parsed.ok || !parsed.source.declaration) return null
  let node = parsed.source.expression
  let sign = 1
  while (node.kind === 'unary-expression' &&
      (node.operator === '+' || node.operator === '-')) {
    if (node.operator === '-') sign *= -1
    node = node.operand
  }
  if (node.kind !== 'scalar-literal') return null
  const expressionSpan = parsed.source.expression.span
  const expressionSource = source.slice(expressionSpan.start, expressionSpan.end)
  const literal = DIRECT_LITERAL.exec(expressionSource)?.[1]
  if (!literal) return null
  const relativeStart = expressionSource.indexOf(literal)
  const span = {
    start: expressionSpan.start + relativeStart,
    end: expressionSpan.start + relativeStart + literal.length,
  }
  return {
    name: parsed.source.declaration.name,
    span,
    value: sign * node.value,
  }
}

export function formatScalarSource(value: number): string {
  if (!Number.isFinite(value)) throw new Error('Scalar source values must be finite.')
  return Object.is(value, -0) ? '0' : value.toString()
}
