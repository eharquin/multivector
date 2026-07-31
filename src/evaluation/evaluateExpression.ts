import { AlgebraOperationError, type VgaEngine } from '../algebra/vgaEngine'
import type { OwnedMultivector } from '../domain/multivector'
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

/**
 * Evaluates an owned syntax node exclusively through the supplied algebra
 * capability boundary.
 */
export function evaluateExpression(
  expression: CoreExpressionNode,
  engine: VgaEngine,
  resolveReference?: (
    name: string,
    property: 'position' | 'head' | null,
  ) => OwnedMultivector,
): OwnedMultivector {
  try {
    return evaluateExpressionUnchecked(expression, engine, resolveReference)
  } catch (error) {
    if (error instanceof AlgebraOperationError) {
      throw new ExpressionEvaluationError(error.code, error.message, expression.origin)
    }
    throw error
  }
}

function evaluateExpressionUnchecked(
  expression: CoreExpressionNode,
  engine: VgaEngine,
  resolveReference?: (
    name: string,
    property: 'position' | 'head' | null,
  ) => OwnedMultivector,
): OwnedMultivector {
  switch (expression.kind) {
    case 'scalar':
      return engine.scalar(expression.value)
    case 'basis-blade':
      return engine.basisBlade(expression.name)
    case 'pseudoscalar':
      return engine.pseudoscalar()
    case 'reference':
      if (!resolveReference) {
        throw new Error(`No value is available for “${expression.name}”.`)
      }
      return resolveReference(expression.name, expression.property)
    case 'add':
      return engine.add(
        evaluateExpression(expression.left, engine, resolveReference),
        evaluateExpression(expression.right, engine, resolveReference),
      )
    case 'multiply':
      return engine.multiply(
        evaluateExpression(expression.left, engine, resolveReference),
        evaluateExpression(expression.right, engine, resolveReference),
      )
    case 'divide':
      return engine.divide(
        evaluateExpression(expression.left, engine, resolveReference),
        evaluateExpression(expression.right, engine, resolveReference),
      )
    case 'sandwich':
      return engine.sandwich(
        evaluateExpression(expression.left, engine, resolveReference),
        evaluateExpression(expression.right, engine, resolveReference),
      )
    case 'power': {
      const exponent = evaluateExpression(expression.exponent, engine, resolveReference)
      if (exponent.coefficients.slice(1).some((coefficient) => coefficient !== 0)) {
        throw new ExpressionEvaluationError('ALG_DOMAIN', 'A geometric power exponent must be scalar.', expression.exponent.origin)
      }
      return engine.power(
        evaluateExpression(expression.base, engine, resolveReference),
        exponent.coefficients[0],
      )
    }
    case 'outer':
      return engine.outer(
        evaluateExpression(expression.left, engine, resolveReference),
        evaluateExpression(expression.right, engine, resolveReference),
      )
    case 'inner':
      return engine.inner(
        evaluateExpression(expression.left, engine, resolveReference),
        evaluateExpression(expression.right, engine, resolveReference),
      )
    case 'regressive':
      return engine.regressive(
        evaluateExpression(expression.left, engine, resolveReference),
        evaluateExpression(expression.right, engine, resolveReference),
      )
    case 'negate':
      return engine.negate(
        evaluateExpression(expression.operand, engine, resolveReference),
      )
    case 'reverse':
      return engine.reverse(
        evaluateExpression(expression.operand, engine, resolveReference),
      )
    case 'dual':
      return engine.dual(
        evaluateExpression(expression.operand, engine, resolveReference),
      )
    case 'grade-involution':
      return engine.gradeInvolution(
        evaluateExpression(expression.operand, engine, resolveReference),
      )
    case 'inverse':
      return engine.inverse(evaluateExpression(expression.operand, engine, resolveReference))
    case 'norm':
      return engine.norm(evaluateExpression(expression.operand, engine, resolveReference))
    case 'exp':
      return engine.exp(evaluateExpression(expression.operand, engine, resolveReference))
    case 'scalar-function':
      return engine.scalarFunction(
        expression.name,
        evaluateExpression(expression.operand, engine, resolveReference),
      )
    case 'grade':
      return engine.grade(
        evaluateExpression(expression.operand, engine, resolveReference),
        expression.grade,
      )
    case 'coefficient':
      return engine.coefficient(
        evaluateExpression(expression.operand, engine, resolveReference),
        expression.blade,
      )
    case 'unsupported-property':
      throw new ExpressionEvaluationError(
        'LANG_UNSUPPORTED_PROPERTY',
        `The property “${expression.property}” is not supported.`,
        expression.propertyOrigin,
      )
    case 'unsupported-function':
      throw new ExpressionEvaluationError(
        'LANG_UNSUPPORTED_FUNCTION',
        `The function “${expression.name}” is not supported.`,
        expression.origin,
      )
  }
}
