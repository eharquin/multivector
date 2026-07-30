import { describe, expect, it } from 'vitest'
import { createVga2Engine } from '../algebra/vgaEngine'
import { expressionDocument } from '../document/expressionDocument'
import { evaluateDocument } from './evaluateDocument'

const engine = createVga2Engine()

function evaluate(...sources: string[]) {
  return evaluateDocument(
    expressionDocument(
      sources.map((source, index) => ({ id: `item-${index + 1}`, source })),
    ),
    engine,
  )
}

describe('document dependency evaluation', () => {
  it('evaluates named expressions and forward references by dependency order', () => {
    const results = evaluate(
      'B = V1 * V2',
      'V2 = vector(2, 1)',
      'V1 = vector(1, 1)',
    )

    expect(results.map((result) => result.evaluation)).toMatchObject([
      { status: 'valid', inspection: '3 - e12' },
      { status: 'valid', inspection: '2e1 + e2' },
      { status: 'valid', inspection: 'e1 + e2' },
    ])
  })

  it('allows anonymous expressions to reference scalar and multivector values', () => {
    const results = evaluate('S = 12', 'V = e1 + e2', 'S + V')

    expect(results[2].evaluation).toMatchObject({
      status: 'valid',
      inspection: '12 + e1 + e2',
    })
  })

  it('reports undefined names without invalidating unrelated rows', () => {
    const results = evaluate('A = Missing + 1', 'V = e2')

    expect(results[0].evaluation).toMatchObject({
      status: 'invalid',
      diagnostic: {
        code: 'LANG_UNDEFINED_NAME',
        span: { start: 4, end: 11 },
      },
    })
    expect(results[1].evaluation).toMatchObject({
      status: 'valid',
      inspection: 'e2',
    })
  })

  it('reports every duplicate declaration and ambiguous dependent reference', () => {
    const results = evaluate('A = 1', 'A = 2', 'A + e1')

    expect(results.map((result) => result.evaluation)).toMatchObject([
      { status: 'invalid', diagnostic: { code: 'LANG_DUPLICATE_NAME' } },
      { status: 'invalid', diagnostic: { code: 'LANG_DUPLICATE_NAME' } },
      { status: 'invalid', diagnostic: { code: 'LANG_DUPLICATE_NAME' } },
    ])
  })

  it('marks cycles and propagates invalid dependency state', () => {
    const results = evaluate('A = B', 'B = A', 'C = A + 1', 'e2')

    expect(results.map((result) => result.evaluation)).toMatchObject([
      { status: 'invalid', diagnostic: { code: 'LANG_DEPENDENCY_CYCLE' } },
      { status: 'invalid', diagnostic: { code: 'LANG_DEPENDENCY_CYCLE' } },
      { status: 'invalid', diagnostic: { code: 'LANG_INVALID_DEPENDENCY' } },
      { status: 'valid', inspection: 'e2' },
    ])
  })
})
