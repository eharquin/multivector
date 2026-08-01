import { describe, expect, it } from 'vitest'
import { toCanonicalDocument } from './canonicalDocument'
import { browserDocumentStorage } from './documentStorage'
import { expressionDocument } from './expressionDocument'

describe('document storage', () => {
  it('stores and restores a validated canonical revision', () => {
    const values = new Map<string, string>()
    const storage = browserDocumentStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value) },
    })
    const document = toCanonicalDocument(expressionDocument([{ id: 'a', source: '2' }]), 'system')
    storage.save(document)
    expect(storage.load()).toEqual(document)
  })

  it('retains the last valid revision when a later write fails', () => {
    let stored: string | null = null
    let fail = false
    const storage = browserDocumentStorage({
      getItem: () => stored,
      setItem: (_key, value) => {
        if (fail) throw new DOMException('Quota exceeded', 'QuotaExceededError')
        stored = value
      },
    })
    const document = toCanonicalDocument(expressionDocument([{ id: 'a', source: '2' }]), 'light')
    storage.save(document)
    fail = true
    expect(() => storage.save({ ...document, metadata: { title: 'Changed', description: '' } })).toThrow()
    expect(storage.load()).toEqual(document)
  })
})
