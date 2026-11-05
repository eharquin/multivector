# Self-contained scene links

Scene links carry a complete [canonical document](document-format.md) in the
URL fragment. They require no backend or stored document identifier. Use
**Copy link** or **Copy iframe code** in the application header. Clipboard
denial leaves selectable text available for manual copying.

## Version 1 envelope

```text
https://eharquin.github.io/gamut/#scene=1.deflate-raw.<sha256>.<base64url>
```

The `scene` key is literal and appears once. Its value has four dot-separated
fields:

1. Envelope version `1`, independent of `formatVersion` and `languageVersion`.
2. Encoding: `deflate-raw` (RFC 1951) or `json` (uncompressed UTF-8 JSON).
3. SHA-256 of the payload bytes, as 64 lowercase hexadecimal characters.
4. Payload bytes as canonical, unpadded base64url, with no whitespace.

The payload is the complete canonical JSON, including document and item
identities, algebra, interpretation, sources, controls, appearance, viewport,
and theme. JSON property order is canonicalized before compression. Equivalent
documents produce the same link in a given browser implementation. Different
conforming DEFLATE implementations may produce different valid compressed
bytes; document identity is defined by the decoded canonical JSON.

The encoder uses `CompressionStream('deflate-raw')`. It selects `json` when
compression would increase size or would exceed the 64:1 decoding ratio.
Compression and decompression use browser APIs; no compression dependency is
bundled. Missing Web Crypto or compression support produces a textual
diagnostic and leaves JSON import/export available. SHA-256 detects corruption;
it does not authenticate the author, so the document is still untrusted input.

Unknown fragment options are ignored. Display options such as `embed`,
`autoplay`, and a theme override are reserved for #215 and have no behavior
in this implementation. The canonical document's theme is preserved.

## Validation and limits

Before parsing the envelope or decoding its payload, enforce the
[64 KiB encoded fragment limit](limits-and-constants.md). This counts every
character after `#`, including unknown options. Then validate the version,
encoding, checksum syntax, and canonical base64url. Verify integrity before
decompression. Read decompressed output incrementally, enforcing both the
4 MiB decoded-byte limit and the 64:1 expansion ratio before assembling JSON.
Uncompressed payloads pass through the same strict UTF-8, duplicate-key,
migration, canonical schema, and resource-limit checks as JSON imports.
Resolve the algebra before displaying the shared document. A failed step
never supplies a partial document to the editor.

Links longer than 8 KiB (complete URL) produce a compatibility warning.
That is a warning threshold, not an asserted Slides.com limit. Oversized
fragments produce `LIMIT_SHARE_ENCODED_SIZE` and direct the user to JSON
export; they never produce a truncated link. The maximum URL accepted by
Slides.com's iframe field remains to be measured in an authenticated host
session. JSON export remains the archival alternative.

## Temporary sessions and storage

On initial navigation to a scene link, decode and validate before mounting the
editor. A valid shared scene never reads the active document or viewport-lock
preference, and never writes browser storage, even during editing, import,
theme changes, or viewport manipulation. It therefore works with blocked or
partitioned storage. Edits do not rewrite the URL; copying another link
captures the current edits. Reloading the original URL reopens its original
scene.

An invalid link displays its diagnostic and retains the existing active
document when it can be restored, otherwise the normal initial example. This
fallback session also disables automatic writes. **Save local copy** explicitly
writes the current document with a new document identity and enables ordinary
autosave after success. A failed save retains the temporary session and JSON
export. No separate local-library implementation is introduced here.

## Iframe code and scope

```html
<iframe src="https://eharquin.github.io/gamut/#scene=1.…"
        title="Interactive GAMUT scene" width="800" height="600"
        allow="fullscreen"></iframe>
```

The generated snippet escapes its `src` attribute and includes a title and
fullscreen permission. It currently opens the full editor. A focused viewport,
responsive embed controls, autoplay, the application fullscreen control, and
“Open in GAMUT” belong to #215. Viewport scalar sliders belong to #190. Native
slides, a `postMessage` API, and release-pinned hosting are outside #213.

Slides.com accepts an HTTPS URL or iframe code in its iframe source field;
actual host integration and host-specific URL-length limits require a host
test ([Slides.com iframe documentation](https://slides.com/docs/iframe-blocks)).
The browser compression format is specified by the
[Compression Standard](https://compression.spec.whatwg.org/).
