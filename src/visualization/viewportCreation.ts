import { formatRoundTripNumber } from '../domain/numberFormat'

const DECLARATION_NAME = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/
const MAX_COORDINATE_DECIMALS = 8

/** Returns the first generated vector name that is not already declared. */
/** The first free `prefix<n>` name among the document's declarations. */
export function nextObjectName(sources: readonly string[], prefix: string): string {
  const declarations = new Set(
    sources.flatMap((source) => {
      const name = DECLARATION_NAME.exec(source)?.[1]
      return name ? [name] : []
    }),
  )
  let suffix = 1
  while (declarations.has(`${prefix}${suffix}`)) suffix += 1
  return `${prefix}${suffix}`
}

export function nextVectorName(sources: readonly string[]): string {
  return nextObjectName(sources, 'V')
}

/**
 * Keeps created source stable and readable while retaining approximately one
 * tenth of a reference screen pixel at the current zoom.
 */
export function formatViewportCoordinate(
  value: number,
  pixelsPerUnit: number,
): string {
  const decimals = Math.max(
    0,
    Math.min(
      MAX_COORDINATE_DECIMALS,
      Math.ceil(Math.log10(Math.max(1, pixelsPerUnit * 10))),
    ),
  )
  const rounded = Number(value.toFixed(decimals))
  return formatRoundTripNumber(rounded)
}

/** The declaration created for a located object at a viewport point (INTERACT2D-001). */
export function creationSource(
  constructor: string,
  name: string,
  point: Readonly<{ x: number; y: number }>,
  pixelsPerUnit: number,
): string {
  return `${name} = ${constructor}(${formatViewportCoordinate(point.x, pixelsPerUnit)}, ${
    formatViewportCoordinate(point.y, pixelsPerUnit)
  })`
}

export function vectorCreationSource(
  name: string,
  point: Readonly<{ x: number; y: number }>,
  pixelsPerUnit: number,
): string {
  return creationSource('vector', name, point, pixelsPerUnit)
}
