import { type AlgebraReference } from '../algebra/algebraDefinition'
import { type AlgebraRegistry } from '../algebra/registry'
import { DocumentFormatError } from '../document/canonicalDocument'

/**
 * Rejects a document whose algebra the runtime cannot provide, so that its
 * source stays untouched in the file or store it came from (ALG-005). The
 * error carries the registry's structured code in its message.
 */
export function requireAvailableAlgebra(registry: AlgebraRegistry, algebra: AlgebraReference): void {
  const resolution = registry.resolve(algebra)
  if (resolution.status === 'unavailable') {
    throw new DocumentFormatError(
      'DOCUMENT_ALGEBRA_UNAVAILABLE',
      `${resolution.code}: ${resolution.message}`,
    )
  }
}
