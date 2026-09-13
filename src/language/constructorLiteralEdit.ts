import type { SurfaceExpressionNode } from './ast'
import { formatScalarSource } from './directScalarEdit'
import { parseDocumentExpression, parseExpression } from './parseExpression'

export type SourceSpan = Readonly<{ start: number; end: number }>

/** One constructor argument as a direct-edit target: a numeric literal or a signed name. */
export type ConstructorComponentEdit =
  | Readonly<{ kind: 'literal'; span: SourceSpan }>
  | Readonly<{ kind: 'reference'; name: string; sign: 1 | -1 }>

function numericSpan(node: SurfaceExpressionNode): SourceSpan | null {
  let current = node
  while (current.kind === 'unary-expression' &&
      (current.operator === '+' || current.operator === '-')) current = current.operand
  return current.kind === 'scalar-literal' ? node.span : null
}

function componentEdit(node: SurfaceExpressionNode): ConstructorComponentEdit | null {
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

/** The argument nodes of a constructor call, whichever surface syntax wrote it. */
function constructorArguments(
  node: SurfaceExpressionNode,
  constructor: string,
): readonly SurfaceExpressionNode[] | null {
  if (constructor === 'vector' && node.kind === 'vector-constructor') return node.components
  if (node.kind === 'call-expression' && node.callee === constructor) return node.arguments
  return null
}

function componentsOf(
  node: SurfaceExpressionNode,
  constructor: string,
  arity: number,
): readonly ConstructorComponentEdit[] | null {
  const args = constructorArguments(node, constructor)
  if (!args || args.length !== arity) return null
  const components = args.map(componentEdit)
  return components.every((component) => component !== null)
    ? components as ConstructorComponentEdit[]
    : null
}

/**
 * The direct-edit components of a named declaration whose expression is a
 * call to `constructor` with `arity` arguments, each a literal or a signed
 * name; `null` when the source cannot be rewritten in place (EDIT).
 */
export function directDeclaredConstructorComponents(
  source: string,
  constructor: string,
  arity: number,
): readonly ConstructorComponentEdit[] | null {
  const parsed = parseDocumentExpression(source)
  if (!parsed.ok || !parsed.source.declaration) return null
  return componentsOf(parsed.source.expression, constructor, arity)
}

/** The same for a bare expression, such as a position source. */
export function directConstructorComponents(
  source: string,
  constructor: string,
  arity: number,
): readonly ConstructorComponentEdit[] | null {
  const parsed = parseExpression(source)
  return parsed.ok ? componentsOf(parsed.expression, constructor, arity) : null
}

/**
 * Rewrites the literal components in place with the deterministic scalar
 * source format; referenced names are left for their own scalar edits.
 */
export function rewriteConstructorLiterals(
  source: string,
  components: readonly ConstructorComponentEdit[],
  values: readonly number[],
): string {
  return components.flatMap((component, index) => component.kind === 'literal'
    ? [{ span: component.span, value: formatScalarSource(values[index]) }]
    : [])
    .sort((left, right) => right.span.start - left.span.start)
    .reduce((result, replacement) =>
      result.slice(0, replacement.span.start) + replacement.value +
        result.slice(replacement.span.end), source)
}
