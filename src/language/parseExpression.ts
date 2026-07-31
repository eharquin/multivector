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
  ReferenceNode,
  VectorConstructorNode,
} from './ast'

export type ParseResult =
  | Readonly<{ ok: true; expression: SurfaceExpressionNode }>
  | Readonly<{ ok: false; diagnostic: Diagnostic }>

export type ParsedDocumentExpression = Readonly<{
  declaration: Readonly<{ name: string; span: SourceSpan }> | null
  expression: SurfaceExpressionNode
}>

export type DocumentExpressionParseResult =
  | Readonly<{ ok: true; source: ParsedDocumentExpression }>
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
      return (
        (expression.operator === '+' || expression.operator === '-') &&
        isScalarExpression(expression.operand)
      )
    case 'binary-expression':
      return (
        isScalarExpression(expression.left) &&
        isScalarExpression(expression.right)
      )
    case 'basis-blade':
    case 'vector-constructor':
    case 'pseudoscalar':
      return false
    case 'property-expression':
      return (
        expression.property === 'e' ||
        expression.property === 'e1' ||
        expression.property === 'e2' ||
        expression.property === 'e12' ||
        expression.property === 'g0'
      )
    case 'reference':
      return true
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

  parseDocumentExpression(): DocumentExpressionParseResult {
    let declaration: ParsedDocumentExpression['declaration'] = null
    if (
      this.current().kind === 'identifier' &&
      this.tokens[this.offset + 1]?.kind === 'equals'
    ) {
      const identifier = this.current()
      this.offset += 2
      declaration = { name: identifier.text, span: identifier.span }
    }

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
    return {
      ok: true,
      source: { declaration, expression: expression.node },
    }
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
    let left = this.parseGeometric()
    if (!left.ok) return left

    while (true) {
      const explicit = this.consume('star')
      const implicit: boolean =
        !explicit &&
        isImplicitCoefficient(left.node) &&
        (this.current().kind === 'blade' ||
          this.current().kind === 'pseudoscalar')

      if (!explicit && !implicit) break

      const right = this.parseGeometric()
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

  private parseGeometric(): NodeResult {
    let left = this.parseUnary()
    if (!left.ok) return left

    while (
      this.current().kind === 'caret' ||
      this.current().kind === 'pipe' ||
      this.current().kind === 'ampersand'
    ) {
      const operator = this.current()
      this.offset += 1
      const right = this.parseUnary()
      if (!right.ok) return right
      left = {
        ok: true,
        node: {
          kind: 'binary-expression',
          operator:
            operator.kind === 'caret'
              ? '^'
              : operator.kind === 'pipe'
                ? '|'
                : '&',
          left: left.node,
          right: right.node,
          implicit: false,
          span: { start: left.node.span.start, end: right.node.span.end },
        },
      }
    }
    return left
  }

  private parseUnary(): NodeResult {
    const operator =
      this.consume('plus') ??
      this.consume('minus') ??
      this.consume('tilde') ??
      this.consume('bang')
    if (!operator) return this.parsePostfix()

    const operand = this.parseUnary()
    if (!operand.ok) return operand
    return {
      ok: true,
      node: {
        kind: 'unary-expression',
        operator:
          operator.kind === 'plus'
            ? '+'
            : operator.kind === 'minus'
              ? '-'
              : operator.kind === 'tilde'
                ? '~'
                : '!',
        operand: operand.node,
        span: { start: operator.span.start, end: operand.node.span.end },
      },
    }
  }

  private parsePostfix(): NodeResult {
    let expression = this.parsePrimary()
    if (!expression.ok) return expression

    while (this.consume('dot')) {
      const propertyToken =
        this.consume('identifier') ?? this.consume('blade')
      if (!propertyToken) {
        return {
          ok: false,
          diagnostic: syntaxDiagnostic(
            'Expected a property name after “.”.',
            insertionAt(this.current()),
          ),
        }
      }

      if (
        expression.node.kind === 'reference' &&
        expression.node.property === null &&
        (propertyToken.text === 'position' || propertyToken.text === 'head')
      ) {
        expression = {
          ok: true,
          node: {
            ...expression.node,
            property: propertyToken.text,
            span: {
              start: expression.node.span.start,
              end: propertyToken.span.end,
            },
          },
        }
        continue
      }

      expression = {
        ok: true,
        node: {
          kind: 'property-expression',
          object: expression.node,
          property: propertyToken.text,
          propertySpan: propertyToken.span,
          span: {
            start: expression.node.span.start,
            end: propertyToken.span.end,
          },
        },
      }
    }
    return expression
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


    if (this.consume('pseudoscalar')) {
      return {
        ok: true,
        node: { kind: 'pseudoscalar', span: token.span },
      }
    }

    if (this.consume('identifier')) {
      return {
        ok: true,
        node: {
          kind: 'reference',
          name: token.text,
          property: null,
          span: token.span,
        },
      }
    }

    if (this.consume('vector')) return this.parseVector(token)

    const leftParenthesis = this.consume('left-parenthesis')
    if (leftParenthesis) {
      const first = this.parseAdditive()
      if (!first.ok) return first

      if (this.consume('comma')) {
        if (!isScalarExpression(first.node)) {
          return {
            ok: false,
            diagnostic: syntaxDiagnostic(
              'Vector components must be scalar expressions.',
              first.node.span,
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
              start: leftParenthesis.span.start,
              end: rightParenthesis.span.end,
            },
          },
        }
      }

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
          ...first.node,
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
 * Parses the current VGA(2) expression-language subset with owned spans.
 *
 * Nodes and diagnostics retain half-open UTF-16 source ranges.
 */
export function parseExpression(source: string): ParseResult {
  const tokenized = tokenize(source)
  if (!tokenized.ok) return tokenized
  return new Parser(tokenized.tokens).parse()
}

/** Parses an optional named declaration followed by an expression. */
export function parseDocumentExpression(
  source: string,
): DocumentExpressionParseResult {
  const tokenized = tokenize(source)
  if (!tokenized.ok) return tokenized
  return new Parser(tokenized.tokens).parseDocumentExpression()
}
