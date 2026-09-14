import { AlgebraOperationError, type AlgebraEngine } from '../algebra/algebraEngine'
import { permutedBlade } from '../domain/algebraBasis'
import type { OwnedMultivector } from '../domain/multivector'
import {
  elementIdentity,
  MAX_GENERATED_VALUES,
  ownedList,
  retainElementIdentity,
  type LanguageValue,
  type ListElement,
} from '../domain/languageValue'
import type { CoreExpressionNode } from '../language/ast'

export class ExpressionEvaluationError extends Error {
  readonly code: string
  readonly origin: CoreExpressionNode['origin']

  constructor(
    code: string,
    message: string,
    origin: CoreExpressionNode['origin'],
  ) {
    super(message)
    this.code = code
    this.origin = origin
  }
}

export type EvaluationBudget = { work: number; generatedValues: number }
const MAX_DOCUMENT_VALUES = 100_000
const MAX_EVALUATION_WORK = 10_000_000

/**
 * Evaluates an owned syntax node exclusively through the supplied algebra
 * capability boundary.
 */
export function evaluateExpression(
  expression: CoreExpressionNode,
  engine: AlgebraEngine,
  resolveReference?: (
    name: string,
    property: 'position' | 'head' | null,
  ) => LanguageValue,
  identityScope?: string,
  budget: EvaluationBudget = { work: 0, generatedValues: 0 },
): LanguageValue {
  chargeWork(budget, 1, expression)
  try {
    return evaluateExpressionUnchecked(
      expression, engine, resolveReference, identityScope ?? 'source', budget,
    )
  } catch (error) {
    if (error instanceof AlgebraOperationError) {
      throw new ExpressionEvaluationError(error.code, error.message, expression.origin)
    }
    throw error
  }
}

function evaluateExpressionUnchecked(
  expression: CoreExpressionNode,
  engine: AlgebraEngine,
  resolveReference?: (
    name: string,
    property: 'position' | 'head' | null,
  ) => LanguageValue,
  identityScope?: string,
  budget: EvaluationBudget = { work: 0, generatedValues: 0 },
): LanguageValue {
  const scope = identityScope ?? 'source'
  const evaluate = (node: CoreExpressionNode) =>
    evaluateExpression(node, engine, resolveReference, scope, budget)
  switch (expression.kind) {
    case 'scalar':
      return engine.scalar(expression.value)
    case 'basis-blade': {
      const resolved = resolveBlade(engine, expression.name, expression)
      const value = engine.basisBlade(engine.basis.blades[resolved.index].name)
      return resolved.sign < 0 ? engine.negate(value) : value
    }
    case 'call': {
      const arities = engine.functions.get(expression.name)
      if (arities === undefined) {
        throw new ExpressionEvaluationError(
          'LANG_UNSUPPORTED_FUNCTION',
          `The function “${expression.name}” is not supported by the active algebra.`,
          expression.origin,
        )
      }
      if (!arities.includes(expression.arguments.length)) {
        const expected = arities.join(' or ')
        throw new ExpressionEvaluationError(
          'LANG_ARITY',
          `“${expression.name}” takes ${expected} ${arities.length === 1 && arities[0] === 1 ? 'argument' : 'arguments'}, received ${expression.arguments.length}.`,
          expression.origin,
        )
      }
      return nary(expression, expression.arguments.map(evaluate),
        (args) => engine.call(expression.name, args), budget)
    }
    case 'pseudoscalar':
      return engine.pseudoscalar()
    case 'reference':
      if (!resolveReference) {
        throw new Error(`No value is available for “${expression.name}”.`)
      }
      return resolveReference(expression.name, expression.property)
    case 'list': {
      const elements: ListElement[] = []
      expression.elements.forEach((element, index) => {
        const value = evaluate(element)
        if (value.kind === 'list') {
          throw new ExpressionEvaluationError(
            'LANG_NESTED_LIST',
            `List element ${index} evaluates to a list; nested lists are not supported.`,
            expression.elementOrigins[index],
          )
        }
        const id = `${scope}:literal:${expression.elementOrigins[index].start}:${expression.elementOrigins[index].end}`
        const sourceIdentity = elementIdentity(value)
        elements.push({
          id,
          value,
          sources: sourceIdentity ? [sourceIdentity] : [id],
        })
      })
      chargeElements(budget, elements.length, expression)
      return ownedList(elements)
    }
    case 'range':
      return evaluateRange(expression, evaluate, engine, scope, budget)
    case 'index': {
      const object = evaluate(expression.object)
      if (object.kind !== 'list') {
        throw new ExpressionEvaluationError(
          'LANG_INDEX_TYPE', 'Only a list can be indexed.', expression.object.origin,
        )
      }
      const index = scalarBoundary(evaluate(expression.index), expression.index, 'A list index')
      if (!Number.isInteger(index) || index < 0) {
        throw new ExpressionEvaluationError(
          'LANG_INDEX_DOMAIN', 'A list index must be a non-negative integer.', expression.index.origin,
        )
      }
      if (index >= object.elements.length) {
        throw new ExpressionEvaluationError(
          'LANG_INDEX_RANGE', `List index ${index} is out of range for ${object.elements.length} elements.`, expression.index.origin,
        )
      }
      return retainElementIdentity(
        object.elements[index].value,
        object.elements[index].id,
      )
    }
    case 'add':
      return binary(expression, evaluate(expression.left), evaluate(expression.right), engine.add, budget)
    case 'multiply':
      return binary(expression, evaluate(expression.left), evaluate(expression.right), engine.multiply, budget)
    case 'divide':
      return binary(expression, evaluate(expression.left), evaluate(expression.right), engine.divide, budget)
    case 'sandwich':
      return binary(expression, evaluate(expression.left), evaluate(expression.right), engine.sandwich, budget)
    case 'power': {
      return binary(expression, evaluate(expression.base), evaluate(expression.exponent),
        (base, exponent) => engine.power(base, scalarMultivectorBoundary(exponent, expression.exponent, 'A geometric power exponent')), budget)
    }
    case 'outer':
      return binary(expression, evaluate(expression.left), evaluate(expression.right), engine.outer, budget)
    case 'inner':
      return binary(expression, evaluate(expression.left), evaluate(expression.right), engine.inner, budget)
    case 'regressive':
      return binary(expression, evaluate(expression.left), evaluate(expression.right), engine.regressive, budget)
    case 'negate':
      return unary(expression, evaluate(expression.operand), engine.negate, budget)
    case 'reverse':
      return unary(expression, evaluate(expression.operand), engine.reverse, budget)
    case 'dual':
      return unary(expression, evaluate(expression.operand), engine.dual, budget)
    case 'grade-involution':
      return unary(expression, evaluate(expression.operand), engine.gradeInvolution, budget)
    case 'inverse':
      return unary(expression, evaluate(expression.operand), engine.inverse, budget)
    case 'norm':
      return unary(expression, evaluate(expression.operand), engine.norm, budget)
    case 'exp':
      return unary(expression, evaluate(expression.operand), engine.exp, budget)
    case 'scalar-function':
      return nary(expression, expression.arguments.map(evaluate),
        (args) => engine.scalarFunction(expression.name, args), budget)
    case 'grade':
      return unary(expression, evaluate(expression.operand),
        (value) => engine.grade(value, expression.grade), budget)
    case 'coefficient': {
      const resolved = resolveBlade(engine, expression.blade, expression)
      const canonical = engine.basis.blades[resolved.index].name
      return unary(expression, evaluate(expression.operand), (value) => {
        const coefficient = engine.coefficient(value, canonical)
        return resolved.sign < 0 ? engine.negate(coefficient) : coefficient
      }, budget)
    }
    case 'unsupported-property':
      throw new ExpressionEvaluationError(
        'LANG_UNSUPPORTED_PROPERTY',
        `The property “${expression.property}” is not supported.`,
        expression.propertyOrigin,
      )
  }
}

/** Resolves a blade name in any generator order against the engine's basis. */
function resolveBlade(
  engine: AlgebraEngine,
  name: string,
  expression: CoreExpressionNode,
): Readonly<{ index: number; sign: 1 | -1 }> {
  const resolved = permutedBlade(engine.basis, name)
  if (!resolved) {
    throw new ExpressionEvaluationError(
      'ALG_UNKNOWN_BLADE',
      `The blade “${name}” does not exist in the active algebra.`,
      expression.origin,
    )
  }
  return resolved
}

function scalarMultivectorBoundary(
  value: OwnedMultivector,
  expression: CoreExpressionNode,
  label: string,
): number {
  if (value.coefficients.slice(1).some((coefficient) => coefficient !== 0)) {
    throw new ExpressionEvaluationError(
      'ALG_DOMAIN', `${label} must be scalar.`, expression.origin,
    )
  }
  return value.coefficients[0]
}

function scalarBoundary(
  value: LanguageValue,
  expression: CoreExpressionNode,
  label: string,
): number {
  if (value.kind === 'list') {
    throw new ExpressionEvaluationError(
      'LANG_SCALAR_REQUIRED', `${label} must be one scalar value.`, expression.origin,
    )
  }
  return scalarMultivectorBoundary(value, expression, label)
}

function unary(
  expression: CoreExpressionNode,
  value: LanguageValue,
  operation: (value: OwnedMultivector) => OwnedMultivector,
  budget: EvaluationBudget,
): LanguageValue {
  if (value.kind === 'multivector') return operation(value)
  chargeElements(budget, value.elements.length, expression)
  return ownedList(value.elements.map((element, index) => {
    try {
      return { id: element.id, value: operation(element.value), sources: element.sources }
    } catch (error) {
      if (error instanceof AlgebraOperationError) {
        throw new ExpressionEvaluationError(
          error.code, `List element ${index}: ${error.message}`, expression.origin,
        )
      }
      throw error
    }
  }))
}

/**
 * Applies an n-ary operation with the list broadcasting rules of `binary`:
 * every list argument has the common length or length one.
 */
function nary(
  expression: CoreExpressionNode,
  values: readonly LanguageValue[],
  operation: (args: readonly OwnedMultivector[]) => OwnedMultivector,
  budget: EvaluationBudget,
): LanguageValue {
  const lists = values.map((value) => (value.kind === 'list' ? value.elements : null))
  if (lists.every((elements) => elements === null)) {
    return operation(values as OwnedMultivector[])
  }
  const lengths = lists.flatMap((elements) => (elements ? [elements.length] : []))
  if (lengths.some((length) => length === 0)) {
    if (lengths.every((length) => length === 0)) return ownedList([])
    throw new ExpressionEvaluationError(
      'LANG_LIST_LENGTH', 'An empty list is incompatible with a non-empty list.', expression.origin,
    )
  }
  const length = Math.max(...lengths)
  if (lengths.some((candidate) => candidate !== 1 && candidate !== length)) {
    throw new ExpressionEvaluationError(
      'LANG_LIST_LENGTH',
      `List lengths ${[...new Set(lengths)].join(' and ')} are incompatible.`,
      expression.origin,
    )
  }
  chargeElements(budget, length, expression)
  const elements: ListElement[] = []
  for (let index = 0; index < length; index += 1) {
    const picked = lists.map((candidates) =>
      candidates ? candidates[candidates.length === 1 ? 0 : index] : null)
    try {
      const result = operation(picked.map((element, position) =>
        element?.value ?? values[position] as OwnedMultivector))
      const participating = picked.map((element) => element?.id).filter(Boolean).join(':')
      elements.push({
        id: `${expression.origin.start}:${expression.origin.end}:${participating}`,
        value: result,
        sources: [...new Set(picked.flatMap((element) => (element ? [element.id] : [])))],
      })
    } catch (error) {
      if (error instanceof AlgebraOperationError) {
        throw new ExpressionEvaluationError(
          error.code, `List element ${index}: ${error.message}`, expression.origin,
        )
      }
      throw error
    }
  }
  return ownedList(elements)
}

function binary(
  expression: CoreExpressionNode,
  left: LanguageValue,
  right: LanguageValue,
  operation: (left: OwnedMultivector, right: OwnedMultivector) => OwnedMultivector,
  budget: EvaluationBudget,
): LanguageValue {
  if (left.kind === 'multivector' && right.kind === 'multivector') {
    return operation(left, right)
  }
  if (left.kind === 'list' && right.kind === 'list') {
    if (left.elements.length === 0 && right.elements.length === 0) return ownedList([])
    if (left.elements.length === 0 || right.elements.length === 0) {
      throw new ExpressionEvaluationError(
        'LANG_LIST_LENGTH', 'An empty list is incompatible with a non-empty list.', expression.origin,
      )
    }
    if (
      left.elements.length !== right.elements.length &&
      left.elements.length !== 1 && right.elements.length !== 1
    ) {
      throw new ExpressionEvaluationError(
        'LANG_LIST_LENGTH',
        `List lengths ${left.elements.length} and ${right.elements.length} are incompatible.`,
        expression.origin,
      )
    }
  }

  const leftElements = left.kind === 'list' ? left.elements : null
  const rightElements = right.kind === 'list' ? right.elements : null
  const length = Math.max(leftElements?.length ?? 0, rightElements?.length ?? 0)
  if (length === 0) return ownedList([])
  chargeElements(budget, length, expression)
  const elements: ListElement[] = []
  for (let index = 0; index < length; index += 1) {
    const leftElement = leftElements
      ? leftElements[leftElements.length === 1 ? 0 : index]
      : null
    const rightElement = rightElements
      ? rightElements[rightElements.length === 1 ? 0 : index]
      : null
    try {
      const result = operation(
        leftElement?.value ?? left as OwnedMultivector,
        rightElement?.value ?? right as OwnedMultivector,
      )
      const participating = [leftElement?.id, rightElement?.id].filter(Boolean).join(':')
      elements.push({
        id: `${expression.origin.start}:${expression.origin.end}:${participating}`,
        value: result,
        sources: [...new Set([
          ...(leftElement ? [leftElement.id] : []),
          ...(rightElement ? [rightElement.id] : []),
        ])],
      })
    } catch (error) {
      if (error instanceof AlgebraOperationError) {
        throw new ExpressionEvaluationError(
          error.code, `List element ${index}: ${error.message}`, expression.origin,
        )
      }
      throw error
    }
  }
  return ownedList(elements)
}

function evaluateRange(
  expression: Extract<CoreExpressionNode, { kind: 'range' }>,
  evaluate: (expression: CoreExpressionNode) => LanguageValue,
  engine: AlgebraEngine,
  identityScope: string,
  budget: EvaluationBudget,
): LanguageValue {
  const start = scalarBoundary(evaluate(expression.start), expression.start, 'A range start')
  const end = scalarBoundary(evaluate(expression.end), expression.end, 'A range end')
  const next = expression.next
    ? scalarBoundary(evaluate(expression.next), expression.next, 'A range next term')
    : null
  if (![start, end, next ?? 0].every(Number.isInteger)) {
    throw new ExpressionEvaluationError(
      'LANG_RANGE_INTEGER', 'Range terms must be finite integers.', expression.origin,
    )
  }
  const step = next === null ? (start <= end ? 1 : -1) : next - start
  if (step === 0 ||
      (start !== end && Math.sign(step) !== Math.sign(end - start))) {
    throw new ExpressionEvaluationError(
      'LANG_RANGE_DIRECTION', 'A range step must be non-zero and directed toward the end.', expression.origin,
    )
  }
  const count = start === end ? 1 : Math.floor(Math.abs((end - start) / step)) + 1
  if (count > MAX_GENERATED_VALUES) {
    throw new ExpressionEvaluationError(
      'LIMIT_GENERATED_VALUES',
      `This range would generate ${count} elements; the limit is ${MAX_GENERATED_VALUES}.`,
      expression.origin,
    )
  }
  chargeElements(budget, count, expression)
  return ownedList(Array.from({ length: count }, (_, ordinal) => {
    const id = `${identityScope}:range:${expression.origin.start}:${expression.origin.end}:${ordinal}`
    return { id, value: engine.scalar(start + ordinal * step), sources: [id] }
  }))
}

function chargeWork(
  budget: EvaluationBudget,
  amount: number,
  expression: CoreExpressionNode,
): void {
  budget.work += amount
  if (budget.work > MAX_EVALUATION_WORK) {
    throw new ExpressionEvaluationError(
      'LIMIT_EVALUATION_WORK',
      `Document evaluation exceeded ${MAX_EVALUATION_WORK} deterministic work units.`,
      expression.origin,
    )
  }
}

function chargeElements(
  budget: EvaluationBudget,
  amount: number,
  expression: CoreExpressionNode,
): void {
  budget.generatedValues += amount
  chargeWork(budget, amount, expression)
  if (budget.generatedValues > MAX_DOCUMENT_VALUES) {
    throw new ExpressionEvaluationError(
      'LIMIT_DOCUMENT_VALUES',
      `Document evaluation exceeded ${MAX_DOCUMENT_VALUES} generated element records.`,
      expression.origin,
    )
  }
}
