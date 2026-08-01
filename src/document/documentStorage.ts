import {
  parseCanonicalDocument,
  serializeCanonicalDocument,
  type CanonicalDocument,
} from './canonicalDocument'

export const ACTIVE_DOCUMENT_KEY = 'multivector.document.active.v1'

export interface DocumentStorage {
  load(): CanonicalDocument | null
  save(document: CanonicalDocument): void
}

/**
 * A minimal browser adapter behind the persistence interface. setItem is
 * atomic for one key: if validation or the write fails, the previous revision
 * remains readable.
 */
export function browserDocumentStorage(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
): DocumentStorage {
  return {
    load() {
      const source = storage.getItem(ACTIVE_DOCUMENT_KEY)
      return source === null ? null : parseCanonicalDocument(source)
    },
    save(document) {
      storage.setItem(ACTIVE_DOCUMENT_KEY, serializeCanonicalDocument(document))
    },
  }
}
