import type {
  CoreExpressionNode,
  SurfaceExpressionNode,
} from './ast'

function scalar(value: number, origin: SurfaceExpressionNode['span']): CoreExpressionNode {
  return { kind: 'scalar', value, origin }
}

function blade(
  name: 'e1' | 'e2',
  origin: SurfaceExpressionNode['span'],
): CoreExpressionNode {
  return { kind: 'basis-blade', name, origin }
}

function lowerBlade(
  name: 'e1' | 'e2' | 'e12' | 'e21',
  origin: SurfaceExpressionNode['span'],
): CoreExpressionNode {
  if (name === 'e1' || name === 'e2') return blade(name, origin)

  return name === 'e12'
    ? multiply(blade('e1', origin), blade('e2', origin), origin)
    : multiply(blade('e2', origin), blade('e1', origin), origin)
}

function multiply(
  left: CoreExpressionNode,
  right: CoreExpressionNode,
  origin: SurfaceExpressionNode['span'],
): CoreExpressionNode {
  return { kind: 'multiply', left, right, origin }
}

function add(
  left: CoreExpressionNode,
  right: CoreExpressionNode,
  origin: SurfaceExpressionNode['span'],
): CoreExpressionNode {
  return { kind: 'add', left, right, origin }
}

/**
 * Desugars surface syntax into the algebra operations understood by the core
 * evaluator while retaining a source origin on every generated operation.
 */
export function lowerExpression(
  expression: SurfaceExpressionNode,
): CoreExpressionNode {
  switch (expression.kind) {
    case 'scalar-literal':
      return scalar(expression.value, expression.span)
    case 'basis-blade':
      return lowerBlade(expression.name, expression.span)
    case 'reference':
      return {
        kind: 'reference',
        name: expression.name,
        origin: expression.span,
      }
    case 'unary-expression': {
      const operand = lowerExpression(expression.operand)
      return expression.operator === '+'
        ? operand
        : { kind: 'negate', operand, origin: expression.span }
    }
    case 'binary-expression': {
      const left = lowerExpression(expression.left)
      const right = lowerExpression(expression.right)
      if (expression.operator === '*') {
        return multiply(left, right, expression.span)
      }
      return expression.operator === '+'
        ? add(left, right, expression.span)
        : add(
            left,
            { kind: 'negate', operand: right, origin: expression.right.span },
            expression.span,
          )
    }
    case 'vector-constructor': {
      const [x, y] = expression.components
      return add(
        multiply(
          lowerExpression(x),
          blade('e1', expression.span),
          expression.span,
        ),
        multiply(
          lowerExpression(y),
          blade('e2', expression.span),
          expression.span,
        ),
        expression.span,
      )
    }
  }
}
