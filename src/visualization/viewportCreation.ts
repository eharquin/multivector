const DECLARATION_NAME = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/
const MAX_COORDINATE_DECIMALS = 8

/** Returns the first generated vector name that is not already declared. */
export function nextVectorName(sources: readonly string[]): string {
  const declarations = new Set(
    sources.flatMap((source) => {
      const name = DECLARATION_NAME.exec(source)?.[1]
      return name ? [name] : []
    }),
  )
  let suffix = 1
  while (declarations.has(`V${suffix}`)) suffix += 1
  return `V${suffix}`
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
  return Object.is(rounded, -0) ? '0' : rounded.toString()
}

export function vectorCreationSource(
  name: string,
  point: Readonly<{ x: number; y: number }>,
  pixelsPerUnit: number,
): string {
  return `${name} = vector(${formatViewportCoordinate(point.x, pixelsPerUnit)}, ${
    formatViewportCoordinate(point.y, pixelsPerUnit)
  })`
}
