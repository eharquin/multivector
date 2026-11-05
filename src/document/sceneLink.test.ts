// @vitest-environment node
/// <reference types="node" />
import { describe, expect, it } from 'vitest'
import { deflateRawSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { toCanonicalDocument, serializeCanonicalDocument } from './canonicalDocument'
import { expressionDocument } from './expressionDocument'
import { createSceneLink, decodeSceneFragment, encodeSceneFragment, MAX_SHARE_FRAGMENT_LENGTH, sceneIframeCode } from './sceneLink'

const document = toCanonicalDocument(expressionDocument([
  { id: 'point', source: 'V = vector(2, 3)' },
], {}, { id: 'scene-document', title: 'Scène ∧ Δ' }), 'dark')

function envelope(payload: Uint8Array, encoding = 'deflate-raw'): string {
  return '#scene=1.' + encoding + '.' + createHash('sha256').update(payload).digest('hex') + '.' + Buffer.from(payload).toString('base64url')
}

describe('self-contained scene links', () => {
  it('round trips complete canonical documents and canonicalizes equivalent property order', async () => {
    const fragment = await encodeSceneFragment(document)
    expect(await decodeSceneFragment(fragment)).toEqual(document)
    expect(await encodeSceneFragment({ ...document, items: [...document.items] })).toBe(fragment)
    const reordered = Object.fromEntries(Object.entries(document).reverse()) as typeof document
    expect(await encodeSceneFragment(reordered)).toBe(fragment)
    expect(fragment).toMatch(/^#scene=1\.deflate-raw\./)
  })

  it('builds a link without stale query or fragment and escapes iframe attributes', async () => {
    const url = await createSceneLink(document, 'https://example.org/gamut/?old=1#old')
    expect(url).toMatch(/^https:\/\/example.org\/gamut\/#scene=/)
    expect(await decodeSceneFragment(new URL(url).hash)).toEqual(document)
    expect(sceneIframeCode(url)).toContain('allow="fullscreen"')
    expect(sceneIframeCode('https://example.org/?a="<&b=1')).toContain('&quot;&lt;&amp;b=1')
  })

  it('preserves PGA identifiers, scalar playback, custom appearances and a nondefault viewport', async () => {
    const original = expressionDocument([
      { id: 'a', source: 'A = point(2, 1)', positionSource: 'point(1, 1)' },
      { id: 't', source: 't = 0.5', control: { mode: 'slider', minimumSource: '0', maximumSource: '1', stepSource: '0.1', animation: { mode: 'ping-pong', direction: 'reverse', durationSeconds: 4 } } },
    ], { a: { style: 'yellow-4', visible: true, labelVisible: true, label: 'Point A' } })
    const pga = toCanonicalDocument({
      ...original,
      algebra: { algebraId: 'org.multivector.pga', definitionVersion: 1, conventionVersion: 1, parameters: { dimension: 2 } },
      interpretation: { interpretationId: 'org.multivector.pga-2d', interpretationVersion: 1 },
      view: { ...original.view, visualizerId: 'org.multivector.pga-2d', viewport: { kind: 'two-dimensional', centerX: -12, centerY: 7, zoom: 2.5 } },
    }, 'light')
    expect(await decodeSceneFragment(await encodeSceneFragment(pga))).toEqual(pga)
  })

  it.each([
    ['#scene=2.anything', 'SHARE_VERSION'],
    ['#scene=1.gzip.anything', 'SHARE_ENCODING'],
    ['#scene=', 'SHARE_ENVELOPE'],
    ['#scene=1.json.' + '0'.repeat(64) + '.AA&scene=other', 'SHARE_ENVELOPE'],
    ['#scene=1.json.' + '0'.repeat(64) + '.@@', 'SHARE_BASE64'],
    ['#scene=1.json.' + '0'.repeat(64) + '.AB', 'SHARE_BASE64'],
    ['#scene=1.json.' + '0'.repeat(64) + '.AA', 'SHARE_INTEGRITY'],
    ['#scene=1.deflate-raw.bad.AA', 'SHARE_ENVELOPE'],
  ])('rejects malformed envelopes (%s)', async (fragment, code) => {
    await expect(decodeSceneFragment(fragment)).rejects.toMatchObject({ code })
  })

  it('checks integrity before attempting decompression', async () => {
    const fragment = envelope(new Uint8Array([255, 255])).replace(/\.[a-f0-9]{64}\./, '.' + '0'.repeat(64) + '.')
    await expect(decodeSceneFragment(fragment)).rejects.toMatchObject({ code: 'SHARE_INTEGRITY' })
    await expect(decodeSceneFragment(envelope(new Uint8Array([255, 255])))).rejects.toMatchObject({ code: 'SHARE_COMPRESSION' })
  })

  it('rejects truncated streams even with a matching checksum', async () => {
    const bytes = deflateRawSync(serializeCanonicalDocument(document))
    await expect(decodeSceneFragment(envelope(bytes.subarray(0, bytes.length - 3)))).rejects.toMatchObject({ code: 'SHARE_COMPRESSION' })
  })

  it('bounds encoded input before decoding and decompressed output while reading', async () => {
    await expect(decodeSceneFragment('#scene=' + 'x'.repeat(MAX_SHARE_FRAGMENT_LENGTH))).rejects.toMatchObject({ code: 'LIMIT_SHARE_ENCODED_SIZE' })
    const bomb = deflateRawSync('x'.repeat(100_000))
    await expect(decodeSceneFragment(envelope(bomb))).rejects.toMatchObject({ code: 'LIMIT_DECOMPRESSION_RATIO' })
    const huge = deflateRawSync('x'.repeat(5 * 1024 * 1024))
    await expect(decodeSceneFragment(envelope(huge))).rejects.toMatchObject({ code: 'LIMIT_DECOMPRESSION_RATIO' })
  })

  it('uses bounded uncompressed JSON for documents whose compression would exceed the ratio limit', async () => {
    const repeated = { ...document, items: [], appearance: {}, metadata: { ...document.metadata, description: 'x'.repeat(40_000) } }
    const fragment = await encodeSceneFragment(repeated)
    expect(fragment).toContain('1.json.')
    expect(await decodeSceneFragment(fragment)).toEqual(repeated)
    await expect(encodeSceneFragment({ ...repeated, metadata: { ...repeated.metadata, description: 'x'.repeat(80_000) } })).rejects.toMatchObject({ code: 'LIMIT_SHARE_ENCODED_SIZE' })
  })

  it('routes shared JSON through strict UTF-8 and canonical schema validation', async () => {
    await expect(decodeSceneFragment(envelope(new Uint8Array([255]), 'json'))).rejects.toMatchObject({ code: 'DOCUMENT_UTF8' })
    await expect(decodeSceneFragment(envelope(Buffer.from('{"formatVersion":999}'), 'json'))).rejects.toMatchObject({ code: 'DOCUMENT_FORMAT_VERSION' })
    await expect(decodeSceneFragment(envelope(Buffer.from('{"id":1,"id":2}'), 'json'))).rejects.toMatchObject({ code: 'DOCUMENT_DUPLICATE_KEY' })
  })

  it('ignores unrelated options without altering the scene', async () => {
    const fragment = await encodeSceneFragment(document)
    expect(await decodeSceneFragment(fragment + '&future=ignored')).toEqual(document)
  })
})
