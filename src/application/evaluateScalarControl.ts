import type { VgaEngine } from '../algebra/vgaEngine'
import type { ExpressionControl } from '../document/expressionDocument'
import type { Diagnostic, SourceSpan } from '../domain/diagnostic'
import type { LanguageValue } from '../domain/languageValue'
import { evaluateExpression, ExpressionEvaluationError } from '../evaluation/evaluateExpression'
import type { SurfaceExpressionNode } from '../language/ast'
import { lowerExpression } from '../language/lowerExpression'
import { parseExpression } from '../language/parseExpression'
import type { EvaluatedDocumentItem } from './evaluateDocument'

export type ScalarControlField = 'minimum' | 'maximum' | 'step'
export type ScalarControlFieldState =
  | Readonly<{ status: 'valid'; value: number }>
  | Readonly<{ status: 'invalid'; diagnostic: Diagnostic }>

export type ScalarControlEvaluation = Readonly<{
  fields: Readonly<Record<ScalarControlField, ScalarControlFieldState>>
  status: 'valid' | 'invalid'
  minimum: number | null
  maximum: number | null
  step: number | null
  diagnostic: string | null
}>

function references(expression: SurfaceExpressionNode): readonly Readonly<{
  name: string
  property: 'position' | 'head' | null
  span: SourceSpan
}>[] {
  switch (expression.kind) {
    case 'reference': return [expression]
    case 'unary-expression': return references(expression.operand)
    case 'binary-expression': return [...references(expression.left), ...references(expression.right)]
    case 'property-expression': return references(expression.object)
    case 'vector-constructor': return expression.components.flatMap(references)
    case 'call-expression': return expression.arguments.flatMap(references)
    case 'list-expression': return expression.elements.flatMap(references)
    case 'range-expression': return [expression.start, ...(expression.next ? [expression.next] : []), expression.end].flatMap(references)
    case 'index-expression': return [...references(expression.object), ...references(expression.index)]
    default: return []
  }
}

function invalid(code: string, message: string, span: SourceSpan): ScalarControlFieldState {
  return { status: 'invalid', diagnostic: { code, severity: 'error', message, span } }
}

function declarationName(source: string): string | null {
  return /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(source)?.[1] ?? null
}

export function evaluateScalarControl(
  control: ExpressionControl,
  items: readonly EvaluatedDocumentItem[],
  engine: VgaEngine,
): ScalarControlEvaluation {
  const declarations = new Map<string, EvaluatedDocumentItem[]>()
  items.forEach((item) => {
    const name = declarationName(item.item.source)
    if (!name) return
    declarations.set(name, [...(declarations.get(name) ?? []), item])
  })

  const evaluateField = (source: string): ScalarControlFieldState => {
    const parsed = parseExpression(source)
    if (!parsed.ok) return { status: 'invalid', diagnostic: parsed.diagnostic }
    const resolved = new Map<string, LanguageValue>()
    for (const reference of references(parsed.expression)) {
      if (reference.property !== null) return invalid(
        'CTRL_UNSUPPORTED_REFERENCE',
        'Control bounds may reference scalar values only.',
        reference.span,
      )
      const targets = declarations.get(reference.name)
      if (!targets) return invalid('LANG_UNDEFINED_NAME', `The name “${reference.name}” is not defined.`, reference.span)
      if (targets.length !== 1) return invalid('LANG_DUPLICATE_NAME', `The name “${reference.name}” is declared more than once.`, reference.span)
      const evaluation = targets[0].evaluation
      if (evaluation?.status !== 'valid') return invalid('LANG_INVALID_DEPENDENCY', `The dependency “${reference.name}” is invalid.`, reference.span)
      resolved.set(reference.name, evaluation.value)
    }
    let value: LanguageValue
    try {
      value = evaluateExpression(
        lowerExpression(parsed.expression),
        engine,
        (name) => resolved.get(name)!,
        'scalar-control',
        { work: 0, generatedValues: 0 },
      )
    } catch (error) {
      if (!(error instanceof ExpressionEvaluationError)) throw error
      return invalid(error.code, error.message, error.origin)
    }
    if (value.kind !== 'multivector' || value.coefficients.slice(1).some((coefficient) => coefficient !== 0)) {
      return invalid('CTRL_NON_SCALAR', 'A control bound must evaluate to a pure scalar.', parsed.expression.span)
    }
    const scalar = value.coefficients[0]
    if (!Number.isFinite(scalar)) return invalid('CTRL_NON_FINITE', 'A control bound must be finite.', parsed.expression.span)
    return { status: 'valid', value: scalar }
  }

  const fields = {
    minimum: evaluateField(control.minimumSource),
    maximum: evaluateField(control.maximumSource),
    step: evaluateField(control.stepSource),
  }
  const minimum = fields.minimum.status === 'valid' ? fields.minimum.value : null
  const maximum = fields.maximum.status === 'valid' ? fields.maximum.value : null
  const step = fields.step.status === 'valid' ? fields.step.value : null
  let diagnostic: string | null = null
  if (Object.values(fields).some((field) => field.status === 'invalid'))
    diagnostic = 'Resolve the invalid control-bound source.'
  else if (minimum! >= maximum!) diagnostic = 'Minimum must be less than maximum.'
  else if (step! <= 0) diagnostic = 'Step must be greater than zero.'
  return {
    fields,
    status: diagnostic ? 'invalid' : 'valid',
    minimum,
    maximum,
    step,
    diagnostic,
  }
}
