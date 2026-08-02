import { describe, expect, it } from 'vitest'
import { createVga2Engine } from '../algebra/vgaEngine'
import { expressionDocument, type ExpressionControl } from '../document/expressionDocument'
import { evaluateDocument } from './evaluateDocument'
import { evaluateScalarControl } from './evaluateScalarControl'

const engine = createVga2Engine()
const control = (change: Partial<ExpressionControl> = {}): ExpressionControl => ({
  mode: 'slider', minimumSource: '-10', maximumSource: '10', stepSource: '0.1',
  animation: null, ...change,
})

describe('scalar control evaluation', () => {
  it('evaluates expression-valued scalar bounds against declarations', () => {
    const items = evaluateDocument(expressionDocument([
      { id: 'a', source: 'a = 2' },
      { id: 'b', source: 'b = 5' },
    ]), engine)
    expect(evaluateScalarControl(control({
      minimumSource: '-a', maximumSource: 'b + 1', stepSource: 'a / 4',
    }), items, engine)).toMatchObject({
      status: 'valid', minimum: -2, maximum: 6, step: 0.5,
    })
  })

  it('rejects non-scalar, invalid, and unordered bounds', () => {
    const items = evaluateDocument(expressionDocument([
      { id: 'v', source: 'v = e1' },
    ]), engine)
    expect(evaluateScalarControl(control({ minimumSource: 'v' }), items, engine)
      .fields.minimum).toMatchObject({ status: 'invalid' })
    expect(evaluateScalarControl(control({ minimumSource: '2', maximumSource: '1' }), items, engine))
      .toMatchObject({ status: 'invalid', diagnostic: 'Minimum must be less than maximum.' })
  })
})
