import type { Diagnostic, SourceSpan } from '../domain/diagnostic'
import type {
  BasisBladeNode,
  SurfaceExpressionNode,
} from './ast'
import { tokenize, type Token, type TokenKind } from './tokenize'

export type {
  BasisBladeNode,
  BinaryExpressionNode,
  ScalarLiteralNode,
  SurfaceExpressionNode,
  VectorConstructorNode,
} from './ast'

export type ParseResult =
  | Readonly<{ ok: true; expression: SurfaceExpressionNode }>
  | Readonly<{ ok: false; diagnostic: Diagnostic }>

type NodeResult =
  | Readonly<{ ok: true; node: SurfaceExpressionNode }>
  | Readonly<{ ok: false; diagnostic: Diagnostic }>

function syntaxDiagnostic(message: string, span: SourceSpan): Diagnostic {
  return {
    code: 'LANG_SYNTAX',
    severity: 'error',
    message,
    span,
  }
}

function insertionAt(token: Token): SourceSpan {
  return { start: token.span.start, end: token.span.start }
}

function isImplicitCoefficient(expression: SurfaceExpressionNode): boolean {
  return (
    expression.kind === 'scalar-literal' ||
    (expression.kind === 'unary-expression' &&
      expression.operand.kind === 'scalar-literal')
  )
}

function isScalarExpression(expression: SurfaceExpressionNode): boolean {
  switch (expression.kind) {
    case 'scalar-literal':
      return true
    case 'unary-expression':
      return isScalarExpression(expression.operand)
    case 'binary-expression':
      return (
        isScalarExpression(expression.left) &&
        isScalarExpression(expression.right)
      )
    case 'basis-blade':
    case 'vector-constructor':
      return false
  }
}

class Parser {
  private offset = 0
  private readonly tokens: readonly Token[]

  constructor(tokens: readonly Token[]) {
    this.tokens = tokens
  }

  parse(): ParseResult {
    const expression = this.parseAdditive()
    if (!expression.ok) return expression

    const trailing = this.current()
    if (trailing.kind !== 'end') {
      return {
        ok: false,
        diagnostic: syntaxDiagnostic(
          'Unexpected source after the expression.',
          trailing.span,
        ),
      }
    }
    return { ok: true, expression: expression.node }
  }

  private current(): Token {
    return this.tokens[this.offset]
  }

  private consume(kind: TokenKind): Token | null {
    if (this.current().kind !== kind) return null
    const token = this.current()
    this.offset += 1
    return token
  }

  private parseAdditive(): NodeResult {
    let left = this.parseMultiplicative()
    if (!left.ok) return left

    while (
      this.current().kind === 'plus' ||
      this.current().kind === 'minus'
    ) {
      const operator = this.current()
      this.offset += 1
      const right = this.parseMultiplicative()
      if (!right.ok) return right
      left = {
        ok: true,
        node: {
          kind: 'binary-expression',
          operator: operator.kind === 'plus' ? '+' : '-',
          left: left.node,
          right: right.node,
          implicit: false,
          span: {
            start: left.node.span.start,
            end: right.node.span.end,
          },
        },
      }
    }
    return left
  }

  private parseMultiplicative(): NodeResult {
    let left = this.parseUnary()
    if (!left.ok) return left

    while (true) {
      const explicit = this.consume('star')
      const implicit: boolean =
        !explicit &&
        isImplicitCoefficient(left.node) &&
        this.current().kind === 'blade'

      if (!explicit && !implicit) break

      const right = this.parseUnary()
      if (!right.ok) return right
      left = {
        ok: true,
        node: {
          kind: 'binary-expression',
          operator: '*',
          left: left.node,
          right: right.node,
          implicit,
          span: {
            start: left.node.span.start,
            end: right.node.span.end,
          },
        },
      }
    }
    return left
  }

  private parseUnary(): NodeResult {
    const operator =
      this.consume('plus') ??
      this.consume('minus')
    if (!operator) return this.parsePrimary()

    const operand = this.parseUnary()
    if (!operand.ok) return operand
    return {
      ok: true,
      node: {
        kind: 'unary-expression',
        operator: operator.kind === 'plus' ? '+' : '-',
        operand: operand.node,
        span: { start: operator.span.start, end: operand.node.span.end },
      },
    }
  }

  private parsePrimary(): NodeResult {
    const token = this.current()

    if (this.consume('number')) {
      const value = Number(token.text)
      if (!Number.isFinite(value)) {
        return {
          ok: false,
          diagnostic: syntaxDiagnostic(
            'Scalar literals must be finite.',
            token.span,
          ),
        }
      }
      return {
        ok: true,
        node: {
          kind: 'scalar-literal',
          value: Object.is(value, -0) ? 0 : value,
          span: token.span,
        },
      }
    }

    if (this.consume('blade')) {
      return {
        ok: true,
        node: {
          kind: 'basis-blade',
          name: token.text as BasisBladeNode['name'],
          span: token.span,
        },
      }
    }

    if (this.consume('vector')) return this.parseVector(token)

    const leftParenthesis = this.consume('left-parenthesis')
    if (leftParenthesis) {
      const expression = this.parseAdditive()
      if (!expression.ok) return expression
      const rightParenthesis = this.consume('right-parenthesis')
      if (!rightParenthesis) {
        return {
          ok: false,
          diagnostic: syntaxDiagnostic(
            'Expected “)” after the expression.',
            insertionAt(this.current()),
          ),
        }
      }
      return {
        ok: true,
        node: {
          ...expression.node,
          span: {
            start: leftParenthesis.span.start,
            end: rightParenthesis.span.end,
          },
        },
      }
    }

    return {
      ok: false,
      diagnostic: syntaxDiagnostic('Expected an expression.', token.span),
    }
  }

  private parseVector(vectorToken: Token): NodeResult {
    if (!this.consume('left-parenthesis')) {
      return {
        ok: false,
        diagnostic: syntaxDiagnostic(
          'Expected “(” after vector.',
          insertionAt(this.current()),
        ),
      }
    }

    const first = this.parseAdditive()
    if (!first.ok) return first
    if (!isScalarExpression(first.node)) {
      return {
        ok: false,
        diagnostic: syntaxDiagnostic(
          'Vector components must be scalar expressions.',
          first.node.span,
        ),
      }
    }
    if (!this.consume('comma')) {
      return {
        ok: false,
        diagnostic: syntaxDiagnostic(
          'Expected “,” between vector components.',
          insertionAt(this.current()),
        ),
      }
    }

    const second = this.parseAdditive()
    if (!second.ok) return second
    if (!isScalarExpression(second.node)) {
      return {
        ok: false,
        diagnostic: syntaxDiagnostic(
          'Vector components must be scalar expressions.',
          second.node.span,
        ),
      }
    }
    const rightParenthesis = this.consume('right-parenthesis')
    if (!rightParenthesis) {
      return {
        ok: false,
        diagnostic: syntaxDiagnostic(
          'Expected “)” after vector components.',
          insertionAt(this.current()),
        ),
      }
    }

    return {
      ok: true,
      node: {
        kind: 'vector-constructor',
        components: [first.node, second.node],
        span: {
          start: vectorToken.span.start,
          end: rightParenthesis.span.end,
        },
      },
    }
  }
}

/**
 * Parses the current scalar, vector-constructor, and VGA(2) blade expressions.
 *
 * Nodes and diagnostics retain half-open UTF-16 source ranges.
 */
export function parseExpression(source: string): ParseResult {
  const tokenized = tokenize(source)
  if (!tokenized.ok) return tokenized
  return new Parser(tokenized.tokens).parse()
}
