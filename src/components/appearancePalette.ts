import type { ExpressionAppearance } from '../document/expressionDocument'

const ramps = {
  red: ['#FADADF', '#F5A9B8', '#E8637F', '#C30A3A', '#92072B', '#60041C'],
  blue: ['#D4EBFA', '#A0D0F4', '#55ABDF', '#1482C8', '#0D5F94', '#073D60'],
  green: ['#C8F0DC', '#8DDCB4', '#41BF82', '#0F9D57', '#0A7540', '#064D2A'],
  yellow: ['#FDF0CB', '#FAD880', '#F0B833', '#E8A000', '#AA7500', '#6E4C00'],
  neutral: ['#F7F8FA', '#E1E4EA', '#C0C6D2', '#8B93A4', '#4E5668', '#1E2433'],
} as const

export type PaletteEntry = Readonly<{
  id: string
  hex: string
  name: string
  ramp: string
}>

export const STUDIO_COLORS: readonly PaletteEntry[] = Object.freeze(
  Object.entries(ramps).flatMap(([ramp, colors]) =>
    colors.map((hex, index) => ({
      id: `${ramp}-${index + 1}`,
      hex,
      name: `${ramp} ${index + 1}`,
      ramp,
    })),
  ),
)

export const RAMP_ORDER: readonly string[] = Object.freeze([
  'red',
  'blue',
  'green',
  'yellow',
  'neutral',
])

const DEFAULT_STYLE = 'blue-4'
const DEFAULT_COLOR = '#1482C8'

/**
 * Deterministic style identifier per semantic object kind, so an item without
 * stored appearance still reads consistently across a document. Keys are the
 * strings produced by `describeVga2Entity`, plus the `List` container kind.
 * Ordered for presentation: this table is the source the algebra reference
 * documents, so the mapping and its documentation cannot drift apart.
 */
export const DEFAULT_OBJECT_STYLES: readonly (readonly [string, string])[] =
  Object.freeze([
    ['Scalar', 'green-4'],
    ['Vector', 'yellow-4'],
    ['Bivector', 'red-4'],
    ['Rotor', 'blue-3'],
    ['Mixed multivector', 'blue-4'],
    ['List', 'green-3'],
  ] as const)

export function paletteEntry(style: string): PaletteEntry | undefined {
  return STUDIO_COLORS.find((candidate) => candidate.id === style)
}

export function studioColor(style: string): string {
  return paletteEntry(style)?.hex ?? DEFAULT_COLOR
}

export function defaultStyleForKind(kind: string): string {
  const canonical = kind.startsWith('List') ? 'List' : kind
  return (
    DEFAULT_OBJECT_STYLES.find(([name]) => name === canonical)?.[1] ??
    DEFAULT_STYLE
  )
}

export type ResolvedAppearance = Readonly<{
  visible: boolean
  styleId: string
  color: string
  labelVisible: boolean
  /** Stored label text, authoritative for editing; empty selects the default. */
  label: string
  /** Label actually drawn, or `null` when neither text nor a declared name exists. */
  displayLabel: string | null
  borderVisible: boolean
}>

/**
 * Applies the renderer-side defaults required by APP-003 to one stored
 * appearance record. Both the expression row and the visualizer resolve through
 * this function so an item cannot be described one way and drawn another.
 */
export function resolveItemAppearance(
  appearance: ExpressionAppearance | undefined,
  kind: string,
  declaredName: string | null,
): ResolvedAppearance {
  const styleId = appearance?.style ?? defaultStyleForKind(kind)
  const label = appearance?.label ?? ''
  return {
    visible: appearance?.visible ?? true,
    styleId,
    color: studioColor(styleId),
    labelVisible: appearance?.labelVisible ?? false,
    label,
    displayLabel: label || declaredName,
    borderVisible: appearance?.borderVisible ?? false,
  }
}
