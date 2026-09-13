import {
  type AlgebraDefinition,
  type AlgebraParameters,
  type AlgebraReference,
} from './algebraDefinition'
import { type AlgebraEngine } from './algebraEngine'
import { type AnyInterpretation } from '../geometry/interpretation'

export type InterpretationReference = Readonly<{
  interpretationId: string
  interpretationVersion: number
}>

export type InterpretationResolution =
  | Readonly<{ status: 'resolved'; interpretation: AnyInterpretation }>
  | Readonly<{
      status: 'unavailable'
      code: 'INT_UNKNOWN_INTERPRETATION' | 'INT_UNSUPPORTED_VERSION'
      message: string
    }>

export type AlgebraResolution =
  | Readonly<{
      status: 'resolved'
      definition: AlgebraDefinition
      parameters: AlgebraParameters
      engine: AlgebraEngine
    }>
  | Readonly<{
      status: 'unavailable'
      code:
        | 'ALG_UNKNOWN_DEFINITION'
        | 'ALG_UNSUPPORTED_DEFINITION_VERSION'
        | 'ALG_UNSUPPORTED_CONVENTION_VERSION'
        | 'ALG_INVALID_PARAMETERS'
      message: string
    }>

/**
 * Resolves a document's algebra record to a registered definition and an
 * engine, or explains why it cannot (ALG-005). Resolution never substitutes
 * another algebra: an unknown identifier, an unsupported version, or invalid
 * parameters are structured failures that leave the document untouched.
 */
export type AlgebraRegistry = Readonly<{
  register(definition: AlgebraDefinition): void
  definitions(): readonly AlgebraDefinition[]
  resolve(reference: AlgebraReference): AlgebraResolution
  registerInterpretation(interpretation: AnyInterpretation): void
  resolveInterpretation(reference: InterpretationReference | null): InterpretationResolution
}>

export function createAlgebraRegistry(): AlgebraRegistry {
  const definitions = new Map<string, AlgebraDefinition>()
  const interpretations = new Map<string, AnyInterpretation>()
  return {
    registerInterpretation(interpretation) {
      if (interpretations.has(interpretation.interpretationId)) {
        throw new Error(`Interpretation “${interpretation.interpretationId}” is already registered.`)
      }
      interpretations.set(interpretation.interpretationId, interpretation)
    },
    resolveInterpretation(reference) {
      if (reference === null) {
        return {
          status: 'unavailable',
          code: 'INT_UNKNOWN_INTERPRETATION',
          message: 'The document names no interpretation.',
        }
      }
      const interpretation = interpretations.get(reference.interpretationId)
      if (!interpretation) {
        return {
          status: 'unavailable',
          code: 'INT_UNKNOWN_INTERPRETATION',
          message: `The interpretation “${reference.interpretationId}” is not available in this runtime.`,
        }
      }
      if (interpretation.interpretationVersion !== reference.interpretationVersion) {
        return {
          status: 'unavailable',
          code: 'INT_UNSUPPORTED_VERSION',
          message: `Version ${reference.interpretationVersion} of “${reference.interpretationId}” is not available; this runtime provides version ${interpretation.interpretationVersion}.`,
        }
      }
      return { status: 'resolved', interpretation }
    },
    register(definition) {
      if (definitions.has(definition.algebraId)) {
        throw new Error(`Algebra “${definition.algebraId}” is already registered.`)
      }
      definitions.set(definition.algebraId, definition)
    },
    definitions() {
      return [...definitions.values()]
    },
    resolve(reference) {
      const definition = definitions.get(reference.algebraId)
      if (!definition) {
        return {
          status: 'unavailable',
          code: 'ALG_UNKNOWN_DEFINITION',
          message: `The algebra “${reference.algebraId}” is not available in this runtime.`,
        }
      }
      if (reference.definitionVersion !== definition.definitionVersion) {
        return {
          status: 'unavailable',
          code: 'ALG_UNSUPPORTED_DEFINITION_VERSION',
          message: `Version ${reference.definitionVersion} of “${reference.algebraId}” is not available; this runtime provides version ${definition.definitionVersion}.`,
        }
      }
      if (!definition.conventionVersions.includes(reference.conventionVersion)) {
        return {
          status: 'unavailable',
          code: 'ALG_UNSUPPORTED_CONVENTION_VERSION',
          message: `Convention version ${reference.conventionVersion} of “${reference.algebraId}” is not available; this runtime provides ${definition.conventionVersions.join(', ')}.`,
        }
      }
      const validation = definition.validateParameters(reference.parameters)
      if (validation.status === 'invalid') {
        return {
          status: 'unavailable',
          code: 'ALG_INVALID_PARAMETERS',
          message: `The parameters of “${reference.algebraId}” are invalid: ${validation.message}`,
        }
      }
      return {
        status: 'resolved',
        definition,
        parameters: validation.parameters,
        engine: definition.createEngine(validation.parameters, reference.conventionVersion),
      }
    },
  }
}
