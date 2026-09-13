import { type AlgebraEngine } from './algebraEngine'

/** Presentation-neutral description of a definition for the algebra dialog. */
export type AlgebraInfo = Readonly<{
  name: string
  signature: string
  description: string
  blades: readonly string[]
  bladeSquares: readonly string[]
  cayley: ReadonlyArray<readonly string[]>
  objects: ReadonlyArray<readonly [string, string]>
  subalgebras: ReadonlyArray<readonly [string, string]>
  notes: readonly string[]
}>

export type AlgebraParameters = Readonly<Record<string, unknown>>

/** The `document.algebra` record: what a document says about its algebra (ALG-004). */
export type AlgebraReference = Readonly<{
  algebraId: string
  definitionVersion: number
  conventionVersion: number
  parameters: AlgebraParameters
}>

export type ParameterValidation =
  | Readonly<{ status: 'valid'; parameters: AlgebraParameters }>
  | Readonly<{ status: 'invalid'; message: string }>

/**
 * A registered algebra definition (ALG-001 through ALG-005, ALG-023 through
 * ALG-025, ALG-028). The definition validates and canonicalizes parameters
 * before an engine is constructed and declares which interpretation and
 * visualizer a new document of this algebra uses by default.
 */
export type AlgebraDefinition = Readonly<{
  algebraId: string
  definitionVersion: number
  conventionVersions: readonly number[]
  capabilities: ReadonlySet<string>
  validateParameters(parameters: AlgebraParameters): ParameterValidation
  createEngine(parameters: AlgebraParameters, conventionVersion: number): AlgebraEngine
  info(parameters: AlgebraParameters): AlgebraInfo
  standardInterpretationId: string
  standardVisualizerId: string
}>
