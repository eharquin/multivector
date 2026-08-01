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
    case 'list-expression':
      return {
        kind: 'list',
        elements: expression.elements.map(lowerExpression),
        elementOrigins: expression.elements.map((element) => element.span),
        origin: expression.span,
      }
    case 'range-expression':
      return {
        kind: 'range',
        start: lowerExpression(expression.start),
        next: expression.next ? lowerExpression(expression.next) : null,
        end: lowerExpression(expression.end),
        origin: expression.span,
      }
    case 'index-expression':
      return {
        kind: 'index',
        object: lowerExpression(expression.object),
        index: lowerExpression(expression.index),
        origin: expression.span,
      }
    case 'scalar-literal':
      return scalar(expression.value, expression.span)
    case 'basis-blade':
      return lowerBlade(expression.name, expression.span)
    case 'pseudoscalar':
      return { kind: 'pseudoscalar', origin: expression.span }
    case 'reference':
      return {
        kind: 'reference',
        name: expression.name,
        property: expression.property,
        origin: expression.span,
      }
    case 'unary-expression': {
      const operand = lowerExpression(expression.operand)
      if (expression.operator === '+') return operand
      if (expression.operator === '-') {
        return { kind: 'negate', operand, origin: expression.span }
      }
      return {
        kind: expression.operator === '~' ? 'reverse' : 'dual',
        operand,
        origin: expression.span,
      }
    }
    case 'binary-expression': {
      const left = lowerExpression(expression.left)
      const right = lowerExpression(expression.right)
      if (expression.operator === '*') {
        return multiply(left, right, expression.span)
      }
      if (expression.operator === '/' || expression.operator === '>>>') {
        return {
          kind: expression.operator === '/' ? 'divide' : 'sandwich',
          left,
          right,
          origin: expression.span,
        }
      }
      if (expression.operator === '**') {
        return { kind: 'power', base: left, exponent: right, origin: expression.span }
      }
      if (
        expression.operator === '^' ||
        expression.operator === '|' ||
        expression.operator === '&'
      ) {
        return {
          kind:
            expression.operator === '^'
              ? 'outer'
              : expression.operator === '|'
                ? 'inner'
                : 'regressive',
          left,
          right,
          origin: expression.span,
        }
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
    case 'call-expression': {
      const operand = lowerExpression(expression.arguments[0])
      if (expression.callee === 'exp') {
        return { kind: 'exp', operand, origin: expression.span }
      }
      const scalarFunctions = ['sin', 'cos', 'tan', 'sinh', 'cosh', 'tanh'] as const
      if (scalarFunctions.some((name) => name === expression.callee)) {
        return {
          kind: 'scalar-function',
          name: expression.callee as (typeof scalarFunctions)[number],
          operand,
          origin: expression.span,
        }
      }
      return {
        kind: 'unsupported-function',
        name: expression.callee,
        origin: expression.span,
      }
    }
    case 'property-expression': {
      const operand = lowerExpression(expression.object)
      if (
        expression.property === 'dual' ||
        expression.property === 'reverse' ||
        expression.property === 'involution' ||
        expression.property === 'inverse' ||
        expression.property === 'norm'
      ) {
        return {
          kind: expression.property === 'dual' ? 'dual'
            : expression.property === 'reverse' ? 'reverse'
              : expression.property === 'involution' ? 'grade-involution'
                : expression.property === 'inverse' ? 'inverse' : 'norm',
          operand,
          origin: expression.span,
        }
      }
      const grades = { g0: 0, g1: 1, g2: 2 } as const
      if (expression.property in grades) {
        return {
          kind: 'grade',
          operand,
          grade: grades[expression.property as keyof typeof grades],
          origin: expression.span,
        }
      }
      if (
        expression.property === 'e' ||
        expression.property === 'e1' ||
        expression.property === 'e2' ||
        expression.property === 'e12'
      ) {
        return {
          kind: 'coefficient',
          operand,
          blade: expression.property,
          origin: expression.span,
        }
      }
      return {
        kind: 'unsupported-property',
        operand,
        property: expression.property,
        propertyOrigin: expression.propertySpan,
        origin: expression.span,
      }
    }
  }
}
