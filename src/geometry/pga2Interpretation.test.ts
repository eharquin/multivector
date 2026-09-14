import { describe, expect, it } from 'vitest'
import { createPga2Engine, PGA_2D_BASIS } from '../algebra/pgaEngine'
import { line, point, scale, type Pga2Coefficients } from '../algebra/pga2ReferenceFixtures'
import { ownedMultivector } from '../domain/multivector'
import { detailPga2Entity, interpretPga2, PGA_2D_INTERPRETATION } from './pga2Interpretation'

const owned = (coefficients: Pga2Coefficients) => ownedMultivector(coefficients, PGA_2D_BASIS)
const engine = createPga2Engine()
const c = (values: Partial<Record<'e' | 'e0' | 'e1' | 'e2' | 'e01' | 'e02' | 'e12' | 'e012', number>>) =>
  owned(['e', 'e0', 'e1', 'e2', 'e01', 'e02', 'e12', 'e012'].map((name) => values[name as keyof typeof values] ?? 0) as unknown as Pga2Coefficients)

describe('standard PGA(2) interpretation', () => {
  it('classifies every entity kind of PGA-INT-003', () => {
    expect(interpretPga2(owned([0, 0, 0, 0, 0, 0, 0, 0]))).toMatchObject({ kind: 'scalar', value: 0 })
    expect(interpretPga2(c({ e: 3 }))).toMatchObject({ kind: 'scalar', value: 3 })
    expect(interpretPga2(owned(point(1, 2)))).toMatchObject({ kind: 'euclidean-point', x: 1, y: 2, weight: 1 })
    expect(interpretPga2(owned(point(3, 4, 0)))).toMatchObject({ kind: 'ideal-point', x: 3, y: 4 })
    expect(interpretPga2(owned(line(1, -1, 2)))).toMatchObject({ kind: 'euclidean-line', a: 1, b: -1, c: 2 })
    expect(interpretPga2(owned(line(0, 0, -2)))).toMatchObject({ kind: 'line-at-infinity', c: -2 })
    expect(interpretPga2(c({ e: Math.SQRT1_2, e12: -Math.SQRT1_2 }))).toMatchObject({ kind: 'rotor' })
    expect(interpretPga2(c({ e: 1, e01: -1.5 }))).toMatchObject({ kind: 'translator' })
    expect(interpretPga2(engine.multiply(c({ e: 1, e01: -0.5, e02: -1 }), c({ e: Math.SQRT1_2, e12: -Math.SQRT1_2 }))))
      .toMatchObject({ kind: 'motor' })
    expect(interpretPga2(c({ e2: 1, e012: -0.5 }))).toMatchObject({ kind: 'reflection' })
    expect(interpretPga2(c({ e: 1, e1: 1 }))).toMatchObject({ kind: 'mixed-multivector' })
    expect(interpretPga2(c({ e: 2, e12: 1 }))).toMatchObject({ kind: 'mixed-multivector' })
  })

  it('applies the tolerance to the Euclidean norm first, then the ideal norm', () => {
    const almostIdeal = owned([0, 0, 0, 0, 2, -1, 1e-12, 0])
    expect(interpretPga2(almostIdeal)).toMatchObject({ kind: 'ideal-point', approximated: true })
    const almostAtInfinity = owned([0, 5, 1e-12, 0, 0, 0, 0, 0])
    expect(interpretPga2(almostAtInfinity)).toMatchObject({ kind: 'line-at-infinity', approximated: true })
    const nearlyPoint = owned([1e-12, 0, 0, 0, 2, -1, 1, 0])
    expect(interpretPga2(nearlyPoint)).toMatchObject({ kind: 'euclidean-point', approximated: true })
    expect(interpretPga2(owned(point(1, 2)))).toMatchObject({ approximated: false })
  })

  it('describes projective equivalence through position and weight or equation and scale', () => {
    const doubled = interpretPga2(owned(scale(point(1, 2), 2)))
    expect(doubled).toMatchObject({ kind: 'euclidean-point', weight: 2 })
    expect(detailPga2Entity(doubled)).toBe('at (1, 2), weight 2')
    const reflected = interpretPga2(engine.sandwich(engine.basisBlade('e1'), owned(point(1, 0))))
    expect(reflected).toMatchObject({ kind: 'euclidean-point', weight: -1 })
    expect(detailPga2Entity(reflected)).toBe('at (-1, 0), weight -1')
    expect(detailPga2Entity(interpretPga2(owned(line(3, 4, -10))))).toBe('0.6x + 0.8y − 2 = 0, scale 5')
    expect(detailPga2Entity(interpretPga2(owned(line(1, -1, 0))))).toBe('0.707107x − 0.707107y = 0, scale 1.41421')
    expect(detailPga2Entity(interpretPga2(owned(point(3, 4, 0))))).toBe('direction (3, 4)')
    expect(detailPga2Entity(interpretPga2(c({ e: 1 })))).toBeNull()
  })

  it('owns no positions or heads and maps entities to the PGA primitives', () => {
    const interpretation = PGA_2D_INTERPRETATION
    const p = interpretation.interpret(owned(scale(point(1, 2), 2)))
    expect(interpretation.supportsPosition(p)).toBe(false)
    expect(interpretation.supportsHead(p)).toBe(false)
    expect(interpretation.isPositionValue(owned(point(1, 2)))).toBe(false)
    expect(interpretation.toPrimitive(p, { accessibleName: 'P', position: { x: 0, y: 0 } }))
      .toEqual({ kind: 'point-marker', point: { x: 1, y: 2 }, accessibleName: 'P' })
    const l = interpretation.interpret(owned(line(0, 1, -2)))
    expect(interpretation.toPrimitive(l, { accessibleName: 'L', position: { x: 0, y: 0 } }))
      .toMatchObject({ kind: 'unbounded-line', point: { x: 0, y: 2 }, direction: { x: -1, y: 0 } })
    const d = interpretation.interpret(owned(point(3, 4, 0)))
    expect(interpretation.toPrimitive(d, { accessibleName: 'D', position: { x: 0, y: 0 } }))
      .toEqual({ kind: 'direction-marker', direction: { x: 0.6, y: 0.8 }, accessibleName: 'D' })
    expect(interpretation.toPrimitive(interpretation.interpret(owned(line(0, 0, 1))), { accessibleName: 'I', position: { x: 0, y: 0 } })).toBeNull()
    expect(interpretation.visualization(interpretation.interpret(owned(line(0, 0, 1))))).toMatchObject({ status: 'unsupported' })
    expect(interpretation.visualization(interpretation.interpret(c({ e: 2 })))).toEqual({ status: 'non-spatial' })
    expect(interpretation.defaultName(l, 0)).toBe('Line 1')
    expect(interpretation.defaultName(d, 1)).toBe('Direction 2')
    expect(interpretation.creation).toEqual({ constructor: 'point', namePrefix: 'P', objectName: 'Point' })
    expect(interpretation.literalEdit).toEqual({ constructor: 'point', arity: 2 })
    expect(interpretation.model).toBe('plane-based')
  })
})
