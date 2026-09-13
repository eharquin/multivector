import { describe, expect, it } from 'vitest'
import { createBuiltinAlgebraRegistry } from '../algebra/builtinAlgebras'
import { createVga2Engine } from '../algebra/vgaEngine'
import { evaluateSource } from '../application/evaluateSource'
import { OPAQUE_INTERPRETATION } from './interpretation'
import { VGA_2D_INTERPRETATION } from './vga2Interpretation'

describe('interpretation registry', () => {
  const registry = createBuiltinAlgebraRegistry()

  it('resolves the standard VGA(2) interpretation by identifier and version', () => {
    const resolution = registry.resolveInterpretation({
      interpretationId: 'org.multivector.vga-2d', interpretationVersion: 1,
    })
    expect(resolution).toMatchObject({ status: 'resolved' })
    if (resolution.status === 'resolved') expect(resolution.interpretation).toBe(VGA_2D_INTERPRETATION)
  })

  it('reports an unknown interpretation, an unsupported version, and a missing record', () => {
    expect(registry.resolveInterpretation({ interpretationId: 'org.example.cga-2d', interpretationVersion: 1 }))
      .toMatchObject({ status: 'unavailable', code: 'INT_UNKNOWN_INTERPRETATION' })
    expect(registry.resolveInterpretation({ interpretationId: 'org.multivector.vga-2d', interpretationVersion: 2 }))
      .toMatchObject({ status: 'unavailable', code: 'INT_UNSUPPORTED_VERSION' })
    expect(registry.resolveInterpretation(null))
      .toMatchObject({ status: 'unavailable', code: 'INT_UNKNOWN_INTERPRETATION' })
  })
})

describe('standard VGA(2) interpretation contract', () => {
  const engine = createVga2Engine()
  const interpretation = VGA_2D_INTERPRETATION

  it('owns position semantics for vectors and bivectors only', () => {
    const vector = interpretation.interpret(engine.call('vector', [engine.scalar(1), engine.scalar(2)]))
    const bivector = interpretation.interpret(engine.pseudoscalar())
    const scalar = interpretation.interpret(engine.scalar(3))
    expect(interpretation.supportsPosition(vector)).toBe(true)
    expect(interpretation.supportsPosition(bivector)).toBe(true)
    expect(interpretation.supportsPosition(scalar)).toBe(false)
    expect(interpretation.supportsHead(vector)).toBe(true)
    expect(interpretation.supportsHead(bivector)).toBe(false)
    expect(interpretation.isPositionValue(engine.add(engine.basisBlade('e1'), engine.scalar(1)))).toBe(false)
    expect(interpretation.positionOf(interpretation.positionValue({ x: 4, y: -5 }, engine.basis)))
      .toEqual({ x: 4, y: -5 })
  })

  it('draws a direct outer product of two vectors as a parallelogram', () => {
    const u = interpretation.interpret(engine.call('vector', [engine.scalar(2), engine.scalar(0)]))
    const v = interpretation.interpret(engine.call('vector', [engine.scalar(0), engine.scalar(3)]))
    const area = interpretation.interpret(engine.multiply(engine.scalar(6), engine.pseudoscalar()))
    const primitive = interpretation.toPrimitive(area, {
      accessibleName: 'B', position: { x: 0, y: 0 }, construction: { operator: '^', operands: [u, v] },
    })
    expect(primitive).toMatchObject({ kind: 'oriented-area', shape: { kind: 'parallelogram' } })
    expect(interpretation.toPrimitive(area, { accessibleName: 'B', position: { x: 0, y: 0 } }))
      .toMatchObject({ kind: 'oriented-area', shape: { kind: 'loop' } })
  })
})

describe('evaluation under an unavailable interpretation', () => {
  it('still evaluates and inspects values but withholds geometry', () => {
    const result = evaluateSource('e1 + 2e12', { engine: createVga2Engine(), interpretation: OPAQUE_INTERPRETATION })
    expect(result).toMatchObject({
      status: 'valid',
      inspection: 'e1 + 2e12',
      entity: { kind: 'uninterpreted' },
      primitive: null,
      visualization: { status: 'unsupported' },
    })
  })
})
