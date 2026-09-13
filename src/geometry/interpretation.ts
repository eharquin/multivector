import { type AlgebraBasis } from '../domain/algebraBasis'
import { type OwnedMultivector } from '../domain/multivector'
import { type VisualizationPrimitive } from '../visualization/primitives'

export type Point2d = Readonly<{ x: number; y: number }>

/**
 * The minimum every interpreted entity carries: a stable semantic kind (INT)
 * and whether classification ignored a coefficient within tolerance.
 */
export type InterpretedEntity = Readonly<{ kind: string; approximated?: boolean }>

/** How a value was built, when the interpretation may draw it construction-aware. */
export type PrimitiveConstruction<E extends InterpretedEntity> = Readonly<{
  operator: '^'
  operands: readonly E[]
}>

export type PrimitiveOptions<E extends InterpretedEntity> = Readonly<{
  accessibleName: string
  position: Point2d
  construction?: PrimitiveConstruction<E>
}>

export type VisualizationSupport =
  | Readonly<{ status: 'available' }>
  | Readonly<{ status: 'non-spatial' }>
  | Readonly<{ status: 'unsupported'; message: string }>

/**
 * A versioned geometric reading of owned values, resolved by identifier from
 * `document.interpretation` (ALG-004). It owns entity classification,
 * descriptions, position semantics, and the mapping from entities to
 * renderer-independent primitives; it never sees backend values and never
 * decides how primitives are drawn.
 */
/** How the viewport creates a new located object by double-click (INTERACT2D-001). */
export type ViewportCreation = Readonly<{
  constructor: string
  namePrefix: string
  objectName: string
}>

/** Which declared constructor literal a drag rewrites when entities carry their own location. */
export type LiteralEdit = Readonly<{ constructor: string; arity: number }>

export type Interpretation<E extends InterpretedEntity = InterpretedEntity> = Readonly<{
  interpretationId: string
  interpretationVersion: number
  /** Geometric model, when the algebra admits several readings (for example plane-based PGA). */
  model?: string
  interpret(value: OwnedMultivector): E
  describe(entity: E): string
  /** A short projective or numeric reading shown next to the kind, or `null`. */
  detail(entity: E): string | null
  /** Entities with a primitive but no intrinsic location accept a position (VGA-POS-007). */
  supportsPosition(entity: E): boolean
  /** Entities whose `head` is position plus value (VGA-POS-003). */
  supportsHead(entity: E): boolean
  /** Whether an owned value may serve as a position. */
  isPositionValue(value: OwnedMultivector): boolean
  positionOf(value: OwnedMultivector): Point2d
  positionValue(point: Point2d, basis: AlgebraBasis): OwnedMultivector
  visualization(entity: E): VisualizationSupport
  defaultName(entity: E, index: number): string
  creation: ViewportCreation
  literalEdit: LiteralEdit | null
  toPrimitive(entity: E, options: PrimitiveOptions<E>): VisualizationPrimitive | null
}>

export type AnyInterpretation = Interpretation<InterpretedEntity>

/** Used when a document names an interpretation this runtime does not provide. */
export const OPAQUE_INTERPRETATION: AnyInterpretation = Object.freeze<AnyInterpretation>({
  interpretationId: 'org.multivector.opaque',
  interpretationVersion: 1,
  interpret: () => Object.freeze({ kind: 'uninterpreted' }),
  describe: () => 'Uninterpreted value',
  detail: () => null,
  supportsPosition: () => false,
  supportsHead: () => false,
  isPositionValue: () => false,
  positionOf: () => ({ x: 0, y: 0 }),
  positionValue(_point, basis) {
    throw new RangeError(`No position values under the opaque interpretation (${basis.blades.length} blades).`)
  },
  visualization: () => ({
    status: 'unsupported',
    message: 'The document’s interpretation is not available in this runtime.',
  }),
  defaultName: (_entity, index) => `Value ${index + 1}`,
  creation: { constructor: 'vector', namePrefix: 'V', objectName: 'Object' },
  literalEdit: null,
  toPrimitive: () => null,
})
