import { describe, expect, it } from 'vitest'
import {
  classificationEpsilon,
  classificationScale,
  STANDARD_VGA2_CLASSIFICATION_POLICY,
} from './vga2ClassificationPolicy'

describe('VGA(2) classification policy', () => {
  it('exposes the documented standard tolerance constants', () => {
    expect(STANDARD_VGA2_CLASSIFICATION_POLICY.absoluteFloor).toBe(1e-10)
    expect(STANDARD_VGA2_CLASSIFICATION_POLICY.relativeTerm).toBe(1e-6)
  })

  it('computes scale as the maximum absolute coefficient', () => {
    expect(classificationScale([-1, 0, 0, 3.6e-9])).toBe(1)
    expect(classificationScale([0, 0, 0, 0])).toBe(0)
    expect(classificationScale([2, -5, 3, -0.5])).toBe(5)
  })

  it('computes epsilon as absoluteFloor + relativeTerm * scale', () => {
    const policy = { absoluteFloor: 1e-10, relativeTerm: 1e-6 }
    expect(classificationEpsilon(policy, 0)).toBe(1e-10)
    expect(classificationEpsilon(policy, 1)).toBeCloseTo(1.0001e-6, 15)
    expect(classificationEpsilon(policy, 1000)).toBeCloseTo(1e-3, 6)
  })
})
