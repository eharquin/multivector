import {
  DocumentFormatError,
  MAX_DOCUMENT_BYTES,
  parseCanonicalDocumentBytes,
  serializeCanonicalDocument,
  type CanonicalDocument,
} from './canonicalDocument'

export const MAX_SHARE_FRAGMENT_LENGTH = 64 * 1024
export const SHARE_URL_WARNING_LENGTH = 8 * 1024
export const MAX_DECOMPRESSION_RATIO = 64

function fail(code: string, message: string): never {
  throw new DocumentFormatError(code, message)
}

export function hasSceneFragment(fragment: string): boolean {
  // Detect the key without decoding an unbounded payload before the size check.
  return /(?:^|&)scene(?:=|&|$)/.test(fragment.replace(/^#/, ''))
}

function checkFragmentLength(fragment: string): void {
  if (fragment.replace(/^#/, '').length > MAX_SHARE_FRAGMENT_LENGTH) {
    fail('LIMIT_SHARE_ENCODED_SIZE', 'This scene is too large for a link. Use JSON export instead.')
  }
}

function base64url(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function decodeBase64url(source: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(source) || source.length % 4 === 1) {
    fail('SHARE_BASE64', 'The scene link contains invalid base64url data.')
  }
  const padded = source.replaceAll('-', '+').replaceAll('_', '/')
  const bytes = Uint8Array.from(atob(padded + '='.repeat((4 - padded.length % 4) % 4)), (char) => char.charCodeAt(0))
  if (base64url(bytes) !== source) fail('SHARE_BASE64', 'The scene link is not canonical base64url data.')
  return bytes
}

async function digest(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  if (!globalThis.crypto?.subtle) fail('SHARE_UNSUPPORTED', 'Scene links require a browser with Web Crypto support on HTTPS.')
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function transform(bytes: Uint8Array<ArrayBuffer>, decompress: boolean): Promise<Uint8Array<ArrayBuffer>> {
  if (typeof CompressionStream === 'undefined' || typeof DecompressionStream === 'undefined') {
    fail('SHARE_UNSUPPORTED', 'This browser does not support scene compression. Use JSON import or export instead.')
  }
  let stream: ReadableStream<Uint8Array>
  try {
    const input = new ReadableStream<BufferSource>({ start(controller) { controller.enqueue(bytes); controller.close() } })
    stream = input.pipeThrough(decompress ? new DecompressionStream('deflate-raw') : new CompressionStream('deflate-raw'))
  } catch {
    fail('SHARE_UNSUPPORTED', 'This browser does not support deflate-raw scene links. Use JSON import or export instead.')
  }
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > MAX_DOCUMENT_BYTES) fail('LIMIT_DOCUMENT_DECODED_SIZE', 'The decoded scene exceeds 4 MiB.')
      if (decompress && length > bytes.byteLength * MAX_DECOMPRESSION_RATIO) {
        fail('LIMIT_DECOMPRESSION_RATIO', 'The scene exceeds the 64:1 decompression limit.')
      }
      chunks.push(value)
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined)
    if (error instanceof DocumentFormatError) throw error
    fail('SHARE_COMPRESSION', 'The compressed scene is invalid or truncated.')
  } finally {
    reader.releaseLock()
  }
  const result = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength }
  return result
}

/** Version, encoding and integrity are independent of the canonical document version. */
export async function encodeSceneFragment(document: CanonicalDocument): Promise<string> {
  const json = new TextEncoder().encode(serializeCanonicalDocument(document))
  const compressed = await transform(json, false)
  // Highly repetitive documents must not generate links the expansion guard rejects.
  const useCompression = compressed.length < json.length && json.length <= compressed.length * MAX_DECOMPRESSION_RATIO
  const payload = useCompression ? compressed : json
  const encoding = useCompression ? 'deflate-raw' : 'json'
  const fragment = '#scene=1.' + encoding + '.' + await digest(payload) + '.' + base64url(payload)
  checkFragmentLength(fragment)
  return fragment
}

export async function decodeSceneFragment(fragment: string): Promise<CanonicalDocument> {
  checkFragmentLength(fragment)
  const values = new URLSearchParams(fragment.replace(/^#/, '')).getAll('scene')
  if (values.length !== 1 || !values[0]) fail('SHARE_ENVELOPE', 'The link must contain exactly one nonempty scene.')
  const [version, encoding, checksum, payload, ...extra] = values[0].split('.')
  if (version !== '1') fail('SHARE_VERSION', 'This scene link uses an unsupported encoding version.')
  if (encoding !== 'deflate-raw' && encoding !== 'json') fail('SHARE_ENCODING', 'This scene link uses an unsupported compression encoding.')
  if (extra.length || !/^[a-f0-9]{64}$/.test(checksum ?? '') || !payload) fail('SHARE_ENVELOPE', 'The scene link envelope is malformed.')
  const bytes = decodeBase64url(payload)
  if (await digest(bytes) !== checksum) fail('SHARE_INTEGRITY', 'The scene link is damaged or incomplete.')
  const json = encoding === 'deflate-raw' ? await transform(bytes, true) : bytes
  return parseCanonicalDocumentBytes(json)
}

export async function createSceneLink(document: CanonicalDocument, applicationUrl: string): Promise<string> {
  const url = new URL(applicationUrl)
  url.search = ''
  url.hash = await encodeSceneFragment(document)
  return url.href
}

export function sceneIframeCode(url: string): string {
  const escaped = url.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  return `<iframe src="${escaped}" title="Interactive GAMUT scene" width="800" height="600" allow="fullscreen"></iframe>`
}
