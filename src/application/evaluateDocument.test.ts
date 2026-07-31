import { describe, expect, it } from 'vitest'
import { createVga2Engine } from '../algebra/vgaEngine'
import { expressionDocument } from '../document/expressionDocument'
import type { ExpressionItem } from '../document/expressionDocument'
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

function evaluateItems(items: readonly ExpressionItem[]) {
  return evaluateDocument(expressionDocument(items), engine)
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

  it('keeps positions separate and resolves position and head properties', () => {
    const results = evaluateItems([
      {
        id: 'vector',
        source: 'V = vector(2, 1)',
        positionSource: 'vector(-1, 2)',
      },
      { id: 'position', source: 'P = V.position' },
      { id: 'head', source: 'H = V.head' },
    ])

    expect(results[0]).toMatchObject({
      evaluation: {
        status: 'valid',
        inspection: '2e1 + e2',
        primitive: {
          start: { x: -1, y: 2 },
          end: { x: 1, y: 3 },
        },
      },
      positionEvaluation: {
        status: 'valid',
        inspection: '-e1 + 2e2',
      },
      headInspection: 'e1 + 3e2',
    })
    expect(results[1].evaluation).toMatchObject({
      status: 'valid',
      inspection: '-e1 + 2e2',
    })
    expect(results[2].evaluation).toMatchObject({
      status: 'valid',
      inspection: 'e1 + 3e2',
    })
  })

  it('resolves position dependencies independently of row order', () => {
    const results = evaluateItems([
      {
        id: 'vector',
        source: 'V = (2, 1)',
        positionSource: 'P',
      },
      { id: 'position', source: 'P = (-1, 2)' },
      { id: 'head', source: 'V.head' },
    ])

    expect(results[0]).toMatchObject({
      evaluation: {
        status: 'valid',
        primitive: {
          start: { x: -1, y: 2 },
          end: { x: 1, y: 3 },
        },
      },
      positionEvaluation: {
        status: 'valid',
        inspection: '-e1 + 2e2',
      },
    })
    expect(results[2].evaluation).toMatchObject({
      status: 'valid',
      inspection: 'e1 + 3e2',
    })
  })

  it('detects cycles across position nodes', () => {
    const results = evaluateItems([
      { id: 'a', source: 'A = e1', positionSource: 'B.position' },
      { id: 'b', source: 'B = e2', positionSource: 'A.position' },
    ])

    expect(results.map((result) => result.positionEvaluation)).toMatchObject([
      { status: 'invalid', diagnostic: { code: 'LANG_DEPENDENCY_CYCLE' } },
      { status: 'invalid', diagnostic: { code: 'LANG_DEPENDENCY_CYCLE' } },
    ])
    expect(results.map((result) => result.evaluation)).toMatchObject([
      { status: 'valid', inspection: 'e1' },
      { status: 'valid', inspection: 'e2' },
    ])
  })

  it('renders an invalid position at the origin without invalidating the value', () => {
    const [result] = evaluateItems([
      { id: 'v', source: 'V = e1', positionSource: '12' },
    ])

    expect(result).toMatchObject({
      evaluation: {
        status: 'valid',
        inspection: 'e1',
        primitive: { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
      },
      positionEvaluation: {
        status: 'invalid',
        diagnostic: { code: 'GEOM_INVALID_POSITION' },
      },
    })
  })

  it('does not activate a stored position for a scalar value', () => {
    const [result] = evaluateItems([
      { id: 'scalar', source: 'S = 12', positionSource: 'Missing' },
    ])

    expect(result.evaluation).toMatchObject({
      status: 'valid',
      inspection: '12',
    })
    expect(result.positionEvaluation).toBeNull()
  })

  it('rejects position access on a scalar value', () => {
    const results = evaluate('S = 12', 'S.position')

    expect(results[1].evaluation).toMatchObject({
      status: 'invalid',
      diagnostic: { code: 'LANG_UNSUPPORTED_PROPERTY' },
    })
  })
})
