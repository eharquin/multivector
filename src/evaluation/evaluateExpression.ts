import type { VgaEngine } from '../algebra/vgaEngine'
import type { OwnedMultivector } from '../domain/multivector'
import type { CoreExpressionNode } from '../language/ast'

/**
 * Evaluates an owned syntax node exclusively through the supplied algebra
 * capability boundary.
 */
export function evaluateExpression(
  expression: CoreExpressionNode,
  engine: VgaEngine,
): OwnedMultivector {
  switch (expression.kind) {
    case 'scalar':
      return engine.scalar(expression.value)
    case 'basis-blade':
      return engine.basisBlade(expression.name)
    case 'add':
      return engine.add(
        evaluateExpression(expression.left, engine),
        evaluateExpression(expression.right, engine),
      )
    case 'multiply':
      return engine.multiply(
        evaluateExpression(expression.left, engine),
        evaluateExpression(expression.right, engine),
      )
    case 'negate':
      return engine.negate(evaluateExpression(expression.operand, engine))
  }
}
