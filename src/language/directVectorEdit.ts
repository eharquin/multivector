import type { SurfaceExpressionNode } from './ast'
import { formatScalarSource } from './directScalarEdit'
import { parseDocumentExpression, parseExpression } from './parseExpression'

export type DirectVectorEdit = Readonly<{
  spans: readonly [Readonly<{ start: number; end: number }>, Readonly<{ start: number; end: number }>]
}>

export type DirectVectorComponentEdit =
  | Readonly<{ kind: 'literal'; span: Readonly<{ start: number; end: number }> }>
  | Readonly<{ kind: 'reference'; name: string; sign: 1 | -1 }>

function numericSpan(node: SurfaceExpressionNode): Readonly<{ start: number; end: number }> | null {
  let current = node
  while (current.kind === 'unary-expression' &&
      (current.operator === '+' || current.operator === '-')) current = current.operand
  return current.kind === 'scalar-literal' ? node.span : null
}

function vectorEdit(node: SurfaceExpressionNode): DirectVectorEdit | null {
  if (node.kind !== 'vector-constructor') return null
  const x = numericSpan(node.components[0])
  const y = numericSpan(node.components[1])
  return x && y ? { spans: [x, y] } : null
}

function componentEdit(node: SurfaceExpressionNode): DirectVectorComponentEdit | null {
  const span = numericSpan(node)
  if (span) return { kind: 'literal', span }
  let current = node
  let sign: 1 | -1 = 1
  while (current.kind === 'unary-expression' &&
      (current.operator === '+' || current.operator === '-')) {
    if (current.operator === '-') sign = sign === 1 ? -1 : 1
    current = current.operand
  }
  return current.kind === 'reference' && current.property === null
    ? { kind: 'reference', name: current.name, sign }
    : null
}

export function directDeclaredVectorComponents(
  source: string,
): readonly [DirectVectorComponentEdit, DirectVectorComponentEdit] | null {
  const parsed = parseDocumentExpression(source)
  if (!parsed.ok || !parsed.source.declaration ||
      parsed.source.expression.kind !== 'vector-constructor') return null
  const components = parsed.source.expression.components.map(componentEdit)
  return components[0] && components[1]
    ? [components[0], components[1]]
    : null
}

export function directPositionComponents(
  source: string,
): readonly [DirectVectorComponentEdit, DirectVectorComponentEdit] | null {
  const parsed = parseExpression(source)
  if (!parsed.ok || parsed.expression.kind !== 'vector-constructor') return null
  const components = parsed.expression.components.map(componentEdit)
  return components[0] && components[1]
    ? [components[0], components[1]]
    : null
}

export function rewriteLiteralComponents(
  source: string,
  components: readonly [DirectVectorComponentEdit, DirectVectorComponentEdit],
  x: number,
  y: number,
): string {
  const values = [x, y]
  return components.flatMap((component, index) => component.kind === 'literal'
    ? [{ span: component.span, value: formatScalarSource(values[index]) }]
    : [])
    .sort((left, right) => right.span.start - left.span.start)
    .reduce((result, replacement) =>
      result.slice(0, replacement.span.start) + replacement.value +
        result.slice(replacement.span.end), source)
}

export function directDeclaredVectorEdit(source: string): DirectVectorEdit | null {
  const parsed = parseDocumentExpression(source)
  return parsed.ok && parsed.source.declaration
    ? vectorEdit(parsed.source.expression)
    : null
}

export function directPositionEdit(source: string): DirectVectorEdit | null {
  const parsed = parseExpression(source)
  return parsed.ok ? vectorEdit(parsed.expression) : null
}

export function rewriteDirectVector(
  source: string,
  edit: DirectVectorEdit,
  x: number,
  y: number,
): string {
  const replacements = [
    { span: edit.spans[0], value: formatScalarSource(x) },
    { span: edit.spans[1], value: formatScalarSource(y) },
  ].sort((left, right) => right.span.start - left.span.start)
  return replacements.reduce((result, replacement) =>
    result.slice(0, replacement.span.start) + replacement.value +
      result.slice(replacement.span.end), source)
}
