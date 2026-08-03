import { describe, expect, it } from 'vitest'
import { expressionDocument } from './expressionDocument'
import {
  fromCanonicalDocument,
  parseCanonicalDocument,
  parseCanonicalDocumentBytes,
  serializeCanonicalDocument,
  toCanonicalDocument,
  resolveCanonicalImport,
} from './canonicalDocument'

function sample() {
  return toCanonicalDocument(
    expressionDocument(
      [{ id: 'v', source: 'V = vector(2, 1)', positionSource: '(1, 1)', normalization: 'natural' }],
      { v: { visible: false, labelVisible: true, label: 'V', style: 'yellow-4' } },
      { id: 'doc-1', title: 'Vectors', description: 'A test document' },
    ),
    'dark',
  )
}

describe('canonical document format', () => {
  const errorCode = (action: () => unknown) => {
    try { action() } catch (error) { return (error as { code?: string }).code }
    return undefined
  }
  it('is byte-stable, whitespace-free, sorted, and has no trailing newline', () => {
    const encoded = serializeCanonicalDocument(sample())
    expect(encoded.endsWith('\n')).toBe(false)
    expect(encoded.startsWith('{"algebra":')).toBe(true)
    expect(serializeCanonicalDocument(parseCanonicalDocument(encoded))).toBe(encoded)
  })

  it('round-trips source, position, normalization, appearance, identity, and theme', () => {
    const canonical = parseCanonicalDocument(serializeCanonicalDocument(sample()))
    const restored = fromCanonicalDocument(canonical)
    expect(restored.theme).toBe('dark')
    expect(restored.document).toEqual(expect.objectContaining({
      id: 'doc-1',
      title: 'Vectors',
      description: 'A test document',
      items: [{ id: 'v', source: 'V = vector(2, 1)', positionSource: '(1, 1)', normalization: 'natural' }],
      appearance: { v: { visible: false, labelVisible: true, label: 'V', style: 'yellow-4', borderVisible: false } },
    }))
  })

  it('round-trips annotation prose without assigning executable fields', () => {
    const document = sample()
    const annotation = {
      ...document,
      items: [{
        id: 'note', kind: 'annotation' as const, source: 'Let V be arbitrary. {not syntax}',
        positionSource: null, normalization: null, control: null,
      }],
      appearance: {
        note: { visible: true, labelVisible: false, label: '', style: 'neutral-4', borderVisible: false },
      },
    }
    const encoded = serializeCanonicalDocument(annotation)
    const restored = fromCanonicalDocument(parseCanonicalDocument(encoded))
    expect(restored.document.items).toEqual([{
      id: 'note', kind: 'annotation', source: 'Let V be arbitrary. {not syntax}',
    }])
    expect(serializeCanonicalDocument(toCanonicalDocument(restored.document, restored.theme)))
      .toBe(encoded)
  })

  it('exports object labels as hidden when no appearance override exists', () => {
    const document = expressionDocument([{ id: 'v', source: 'V = e1' }])

    expect(toCanonicalDocument(document, 'system').appearance.v.labelVisible).toBe(false)
  })

  it('migrates version one appearances to borderless version two records', () => {
    const current = sample()
    const legacy = {
      ...current,
      formatVersion: 1,
      appearance: Object.fromEntries(Object.entries(current.appearance).map(
        ([id, appearance]) => {
          const { borderVisible: _borderVisible, ...versionOne } = appearance
          return [id, versionOne]
        },
      )),
    }
    const migrated = parseCanonicalDocument(JSON.stringify(legacy))
    expect(migrated.formatVersion).toBe(2)
    expect(migrated.appearance.v.borderVisible).toBe(false)
  })

  it('rejects duplicate keys before schema validation', () => {
    expect(errorCode(() => parseCanonicalDocument('{"id":"a","id":"b"}'))).toBe('DOCUMENT_DUPLICATE_KEY')
  })

  it('selects the version boundary before complete schema validation', () => {
    expect(errorCode(() => parseCanonicalDocument('{"formatVersion":3,"future":true}'))).toBe('DOCUMENT_FORMAT_VERSION')
  })

  it('rejects unknown fields and unregistered styles', () => {
    const withUnknown = { ...sample(), extra: true }
    expect(errorCode(() => serializeCanonicalDocument(withUnknown as never))).toBe('DOCUMENT_UNKNOWN_FIELD')
    const invalidStyle = { ...sample(), appearance: { v: { ...sample().appearance.v, style: 'purple-9' } } }
    expect(errorCode(() => serializeCanonicalDocument(invalidStyle))).toBe('DOCUMENT_STYLE')
  })

  it('normalizes negative zero during canonicalization', () => {
    const document = { ...sample(), view: { ...sample().view, viewport: { ...sample().view.viewport, centerX: -0 } } }
    expect(serializeCanonicalDocument(document)).toContain('"centerX":0')
  })

  it('orders even integer-like object keys by Unicode code point', () => {
    const document = {
      ...sample(),
      algebra: { ...sample().algebra, parameters: { '2': 0, '10': 0 } },
    }
    expect(serializeCanonicalDocument(document)).toContain('"parameters":{"10":0,"2":0}')
  })

  it('preserves reserved numeric-control and view configuration records', () => {
    const document = sample()
    const configured = {
      ...document,
      items: [{
        ...document.items[0],
        control: {
          mode: 'slider' as const,
          minimumSource: '-2',
          maximumSource: '2',
          stepSource: '0.1',
          animation: {
            mode: 'ping-pong' as const,
            direction: 'forward' as const,
            durationSeconds: 3,
          },
        },
      }],
      view: {
        ...document.view,
        viewport: { ...document.view.viewport, centerX: 4, zoom: 90 },
      },
    }
    const encoded = serializeCanonicalDocument(configured)
    expect(serializeCanonicalDocument(toCanonicalDocument(
      fromCanonicalDocument(parseCanonicalDocument(encoded)).document,
      'dark',
    ))).toBe(encoded)
  })

  it('rejects malformed UTF-8 and a byte-order mark at the byte boundary', () => {
    expect(errorCode(() => parseCanonicalDocumentBytes(new Uint8Array([0xc3, 0x28])))).toBe('DOCUMENT_UTF8')
    expect(errorCode(() => parseCanonicalDocumentBytes(new Uint8Array([0xef, 0xbb, 0xbf, 0x7b, 0x7d])))).toBe('DOCUMENT_BOM')
  })

  it('accepts and byte-stably round-trips the closed none viewport', () => {
    const document = sample()
    const withoutViewport = {
      ...document,
      interpretation: null,
      view: {
        ...document.view,
        visualizerId: null,
        positionEnabled: false,
        viewport: { kind: 'none' as const },
      },
    }
    const encoded = serializeCanonicalDocument(withoutViewport)
    expect(serializeCanonicalDocument(parseCanonicalDocument(encoded))).toBe(encoded)
    expect(fromCanonicalDocument(parseCanonicalDocument(encoded)).document.view.viewport)
      .toEqual({ kind: 'none' })
  })

  it('reports malformed and unknown closed viewport variants precisely', () => {
    const document = sample()
    expect(errorCode(() => serializeCanonicalDocument({
      ...document,
      view: { ...document.view, viewport: { kind: 'three-dimensional' } },
    } as never))).toBe('DOCUMENT_VIEWPORT')
    expect(errorCode(() => serializeCanonicalDocument({
      ...document,
      view: { ...document.view, viewport: { kind: 'none', zoom: 2 } },
    } as never))).toBe('DOCUMENT_UNKNOWN_FIELD')
  })

  it('preserves unsupported view combinations with a recovery diagnostic', () => {
    const document = sample()
    const unsupported = {
      ...document,
      view: { ...document.view, visualizerId: 'org.example.future-view' },
    }
    const restored = fromCanonicalDocument(parseCanonicalDocument(
      serializeCanonicalDocument(unsupported),
    ))
    expect(restored.document.view.visualizerId).toBe('org.example.future-view')
    expect(restored.recoveryDiagnostic).toMatch(/^DOCUMENT_VIEW_UNSUPPORTED:/)
  })

  it('duplicates identity collisions with fresh document and item identities', () => {
    const ids = ['new-document', 'new-item']
    const original = sample()
    const duplicated = resolveCanonicalImport('doc-1', original, 'duplicate', () => ids.shift()!)
    expect(duplicated.id).toBe('new-document')
    expect(duplicated.items[0]).toEqual(expect.objectContaining({
      id: 'new-item',
      source: 'V = vector(2, 1)',
      positionSource: '(1, 1)',
      normalization: 'natural',
    }))
    expect(duplicated.appearance['new-item']).toEqual(original.appearance.v)
    expect(duplicated.appearance.v).toBeUndefined()
    expect(resolveCanonicalImport('doc-1', original, 'replace')).toBe(original)
  })
})
