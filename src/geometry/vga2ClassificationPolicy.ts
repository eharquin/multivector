/**
 * Tuning data for the standard VGA(2) interpretation's classification
 * tolerance (see `interpretVga2` in `vga2Interpretation.ts` and VGA-INT-005).
 * This governs classification decisions only: it never alters owned
 * coefficients or dependent evaluation.
 */
export type Vga2ClassificationPolicy = Readonly<{
  absoluteFloor: number
  relativeTerm: number
}>

export const STANDARD_VGA2_CLASSIFICATION_POLICY: Vga2ClassificationPolicy =
  Object.freeze({ absoluteFloor: 1e-10, relativeTerm: 1e-6 })

/** The magnitude-relative scale input for a classification decision. */
export function classificationScale(coefficients: readonly number[]): number {
  return Math.max(...coefficients.map(Math.abs))
}

/** epsilon = absoluteFloor + relativeTerm * scale. */
export function classificationEpsilon(
  policy: Vga2ClassificationPolicy,
  scale: number,
): number {
  return policy.absoluteFloor + policy.relativeTerm * scale
}
