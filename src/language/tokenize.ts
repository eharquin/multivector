import type { Diagnostic, SourceSpan } from '../domain/diagnostic'

export type TokenKind =
  | 'number'
  | 'vector'
  | 'blade'
  | 'identifier'
  | 'equals'
  | 'dot'
  | 'plus'
  | 'minus'
  | 'star'
  | 'left-parenthesis'
  | 'right-parenthesis'
  | 'comma'
  | 'end'

export type Token = Readonly<{
  kind: TokenKind
  text: string
  span: SourceSpan
}>

export type TokenizeResult =
  | Readonly<{ ok: true; tokens: readonly Token[] }>
  | Readonly<{ ok: false; diagnostic: Diagnostic }>

// An exponent sign is mandatory. Consequently `1e1` becomes `1` then `e1`,
// while `1e+1` remains one numeric token.
const NUMBER_PATTERN =
  /(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]\d+)?/y
const IDENTIFIER_PATTERN = /[A-Za-z_][A-Za-z0-9_]*/y

function diagnostic(message: string, span: SourceSpan): TokenizeResult {
  return {
    ok: false,
    diagnostic: {
      code: 'LANG_SYNTAX',
      severity: 'error',
      message,
      span,
    },
  }
}

/**
 * Tokenizes the current scalar, vector-constructor, and VGA(2) blade syntax.
 *
 * Token spans are half-open UTF-16 ranges in the preserved source.
 */
export function tokenize(source: string): TokenizeResult {
  const tokens: Token[] = []
  let offset = 0

  while (offset < source.length) {
    if (/\s/u.test(source[offset])) {
      offset += 1
      continue
    }

    NUMBER_PATTERN.lastIndex = offset
    const number = NUMBER_PATTERN.exec(source)
    if (number) {
      const end = NUMBER_PATTERN.lastIndex
      tokens.push({
        kind: 'number',
        text: number[0],
        span: { start: offset, end },
      })
      offset = end
      continue
    }

    IDENTIFIER_PATTERN.lastIndex = offset
    const identifier = IDENTIFIER_PATTERN.exec(source)
    if (identifier) {
      const end = IDENTIFIER_PATTERN.lastIndex
      const text = identifier[0]
      if (text === 'vector') {
        tokens.push({
          kind: 'vector',
          text,
          span: { start: offset, end },
        })
      } else if (
        text === 'e1' ||
        text === 'e2' ||
        text === 'e12' ||
        text === 'e21'
      ) {
        tokens.push({
          kind: 'blade',
          text,
          span: { start: offset, end },
        })
      } else {
        tokens.push({
          kind: 'identifier',
          text,
          span: { start: offset, end },
        })
      }
      offset = end
      continue
    }

    const punctuation: Partial<Record<string, TokenKind>> = {
      '+': 'plus',
      '-': 'minus',
      '*': 'star',
      '(': 'left-parenthesis',
      ')': 'right-parenthesis',
      ',': 'comma',
      '=': 'equals',
      '.': 'dot',
    }
    const kind = punctuation[source[offset]]
    if (!kind) {
      return diagnostic(`Unexpected character “${source[offset]}”.`, {
        start: offset,
        end: offset + 1,
      })
    }

    tokens.push({
      kind,
      text: source[offset],
      span: { start: offset, end: offset + 1 },
    })
    offset += 1
  }

  tokens.push({
    kind: 'end',
    text: '',
    span: { start: source.length, end: source.length },
  })
  return { ok: true, tokens }
}
