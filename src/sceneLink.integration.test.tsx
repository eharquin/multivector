/// <reference types="node" />
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import App from './App'
import { parseCanonicalDocument, serializeCanonicalDocument, toCanonicalDocument } from './document/canonicalDocument'
import { ACTIVE_DOCUMENT_KEY } from './document/documentStorage'
import { expressionDocument } from './document/expressionDocument'
import { decodeSceneFragment, encodeSceneFragment } from './document/sceneLink'

const shared = toCanonicalDocument(expressionDocument([
  { id: 'shared-vector', source: 'Shared = vector(3, 4)' },
], {}, { id: 'shared-document', title: 'A shared scene' }), 'dark')
const saved = toCanonicalDocument(expressionDocument([
  { id: 'saved-vector', source: 'Saved = vector(8, 9)' },
], {}, { id: 'saved-document' }), 'light')

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto)
  vi.stubEnv('MODE', 'development')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  window.localStorage.clear()
  window.history.replaceState(null, '', '/')
})

async function openSharedScene() {
  window.history.replaceState(null, '', '/' + await encodeSceneFragment(shared))
  render(<App />)
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Expression 1' })).toHaveValue('Shared = vector(3, 4)'))
}

describe('scene sharing in the application', () => {
  it('loads and edits a temporary scene without reading or writing any local storage, even for viewport lock', async () => {
    const fragment = await encodeSceneFragment(shared)
    window.history.replaceState(null, '', '/' + fragment)
    const storage = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('Storage blocked') })
    render(<App />)
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Expression 1' })).toHaveValue('Shared = vector(3, 4)'))
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 1' }), { target: { value: 'Shared = vector(6, 7)' } })
    fireEvent.click(screen.getByRole('button', { name: /Lock viewport/ }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(storage).not.toHaveBeenCalled()
    expect(window.location.hash).toBe(fragment)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps the saved document intact until an explicit save creates a new local identity', async () => {
    const source = serializeCanonicalDocument(saved)
    window.localStorage.setItem(ACTIVE_DOCUMENT_KEY, source)
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    await openSharedScene()
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 1' }), { target: { value: 'Shared = vector(6, 7)' } })
    expect(writes).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(ACTIVE_DOCUMENT_KEY)).toBe(source)
    fireEvent.click(screen.getByRole('button', { name: 'Save local copy' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Save local copy' })).not.toBeInTheDocument())
    const copy = parseCanonicalDocument(window.localStorage.getItem(ACTIVE_DOCUMENT_KEY)!)
    expect(copy.id).not.toBe(shared.id)
    expect(copy.id).not.toBe(saved.id)
    expect(copy.items[0].source).toBe('Shared = vector(6, 7)')
  })

  it('retains the temporary session and offers export if explicit saving fails', async () => {
    await openSharedScene()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota') })
    fireEvent.click(screen.getByRole('button', { name: 'Save local copy' }))
    expect(screen.getByRole('alert')).toHaveTextContent('STORE_WRITE_FAILED')
    expect(screen.getByRole('button', { name: 'Save local copy' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Expression 1' })).toHaveValue('Shared = vector(3, 4)')
  })

  it('rejects an invalid link without replacing or writing the saved document', async () => {
    window.localStorage.setItem(ACTIVE_DOCUMENT_KEY, serializeCanonicalDocument(saved))
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    window.history.replaceState(null, '', '/#scene=999.bad')
    render(<App />)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('SHARE_VERSION'))
    expect(screen.getByRole('textbox', { name: 'Expression 1' })).toHaveValue('Saved = vector(8, 9)')
    expect(writes).not.toHaveBeenCalled()
  })

  it('copies a self-contained link and iframe code representing the current edits', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    await openSharedScene()
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 1' }), { target: { value: 'Shared = vector(6, 7)' } })
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Scene link' })).toBeInTheDocument())
    const url = writeText.mock.calls[0][0] as string
    expect((await decodeSceneFragment(new URL(url).hash)).items[0].source).toBe('Shared = vector(6, 7)')
    fireEvent.click(screen.getByRole('button', { name: 'Copy iframe code' }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Scene iframe code' })).toBeInTheDocument())
    expect(writeText.mock.calls[1][0]).toContain('<iframe src="' + url + '"')
  })

  it('offers selectable text when clipboard permission is unavailable', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } })
    await openSharedScene()
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Scene link' })).toBeInTheDocument())
    expect(screen.getByText('Select and copy the text below.')).toBeInTheDocument()
  })
})
