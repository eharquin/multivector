import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import {
  DEFAULT_OBJECT_STYLES,
  paletteEntry,
} from './components/appearancePalette'
import { CLEAR_HOLD_MS } from './components/ClearExpressionsButton'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.useRealTimers()
})

function openDisplaySettings(): HTMLElement {
  const trigger = screen.getByRole('button', { name: 'Display settings' })
  fireEvent.click(trigger)
  return trigger
}

function viewportCanvas(): SVGSVGElement {
  return screen.getByRole('img', {
    name: /Two-dimensional VGA viewport/,
  }) as unknown as SVGSVGElement
}

function sizeViewportCanvas(canvas: SVGSVGElement): void {
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, width: 640, height: 480,
    top: 0, right: 640, bottom: 480, left: 0,
    toJSON: () => ({}),
  })
}

describe('VGA 2D vertical slice', () => {
  it('undoes and redoes document edits with controls and standard keyboard shortcuts', () => {
    render(<App />)
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Expression 1' })
    const panel = screen.getByRole('complementary', { name: 'Expressions' })
    const historyControls = within(panel).getByRole('group', { name: 'Expression history' })
    const undo = within(historyControls).getByRole('button', { name: 'Undo document change' })
    const redo = within(historyControls).getByRole('button', { name: 'Redo document change' })
    expect(undo).toBeDisabled()
    expect(redo).toBeDisabled()
    expect(screen.getByRole('banner')).not.toContainElement(undo)

    fireEvent.change(input, { target: { value: 'V = e1' } })
    expect(undo).toBeEnabled()
    input.focus()
    input.setSelectionRange(2, 4, 'forward')
    fireEvent.select(input)
    fireEvent.click(undo)
    expect(input).toHaveValue('vector(2, 1)')
    expect(input).toHaveFocus()
    expect(input.selectionStart).toBe(2)
    expect(input.selectionEnd).toBe(4)
    expect(redo).toBeEnabled()

    fireEvent.keyDown(window, { key: 'y', ctrlKey: true })
    expect(input).toHaveValue('V = e1')
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(input).toHaveValue('vector(2, 1)')
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true })
    expect(input).toHaveValue('V = e1')
  })

  it('returns focus to the originating expression when undo removes an inserted row', () => {
    render(<App />)
    const first = screen.getByRole<HTMLInputElement>('textbox', { name: 'Expression 1' })
    first.focus()
    first.setSelectionRange(3, 3)
    fireEvent.select(first)
    fireEvent.keyDown(first, { key: 'Enter' })
    expect(screen.getByRole('textbox', { name: 'Expression 2' })).toHaveFocus()

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })

    expect(screen.queryByRole('textbox', { name: 'Expression 2' })).not.toBeInTheDocument()
    expect(first).toHaveFocus()
    expect(first.selectionStart).toBe(3)
    expect(first.selectionEnd).toBe(3)
  })

  it('returns to the end of the originating position editor after insertion undo', () => {
    render(<App />)
    const position = screen.getByRole<HTMLInputElement>('textbox', { name: 'Position 1' })
    fireEvent.change(position, { target: { value: '(1,0)' } })
    position.focus()
    position.setSelectionRange(position.value.length, position.value.length)
    fireEvent.select(position)
    fireEvent.keyDown(position, { key: 'Enter' })
    expect(screen.getByRole('textbox', { name: 'Expression 2' })).toHaveFocus()

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })

    expect(position).toHaveFocus()
    expect(position.selectionStart).toBe(position.value.length)
    expect(position.selectionEnd).toBe(position.value.length)
  })

  it('authors the documented foundation example with keyboard row insertion', () => {
    render(<App />)
    const enter = (position: number, source: string) => {
      const input = screen.getByRole('textbox', { name: `Expression ${position}` })
      fireEvent.change(input, { target: { value: source } })
      fireEvent.keyDown(input, { key: 'Enter' })
    }

    enter(1, 's = 2')
    expect(document.activeElement).toBe(
      screen.getByRole('textbox', { name: 'Expression 2' }),
    )
    enter(2, 'V1 = vector(s, 1)')
    fireEvent.change(screen.getByRole('textbox', { name: 'Position 2' }), {
      target: { value: '(1, 1)' },
    })
    enter(3, 'V2 = vector(1, -1)')
    fireEvent.change(screen.getByRole('textbox', { name: 'Position 3' }), {
      target: { value: '(0.1, 0.1)' },
    })
    enter(4, 'L = [V1, V2]')
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 5' }), {
      target: { value: 'H = V1.head' },
    })

    expect(screen.getByText('List (2)')).toBeInTheDocument()
    expect(screen.getByText('3e1 + 2e2', { selector: 'output' }))
      .toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveTextContent(
      '5 vectors and 0 bivectors are visible.',
    )

    const secondVector = screen.getByRole('textbox', { name: 'Expression 3' })
    fireEvent.change(secondVector, { target: { value: 'V2 = vector(1)' } })
    expect(secondVector).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Expected “,” between vector components.'))
      .toBeInTheDocument()
    fireEvent.change(secondVector, {
      target: { value: 'V2 = vector(1, -1)' },
    })
    expect(secondVector).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByRole('img')).toHaveTextContent(
      '5 vectors and 0 bivectors are visible.',
    )
  })

  it('inspects heterogeneous lists and renders supported elements in order', () => {
    render(<App />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 1' }), {
      target: { value: 'L = [1, e1, -2e12]' },
    })

    expect(screen.getByText('List (3)')).toBeInTheDocument()
    expect(screen.getByText('[1, e1, -2e12]', { selector: 'output' }))
      .toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveTextContent(
      '1 vector and 1 bivector are visible.',
    )
    expect(screen.getByRole('img')).toHaveTextContent(
      'L[2] is an oriented loop with signed value -2',
    )
  })

  it('renders a positioned vector list with distinct accessible element names', () => {
    render(<App />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 1' }), {
      target: { value: 'V1 = e1' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Position 1' }), {
      target: { value: '(1, 2)' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add expression' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 2' }), {
      target: { value: 'V2 = e2' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Position 2' }), {
      target: { value: '(-1, 3)' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add expression' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 3' }), {
      target: { value: 'V = [V1, V2]' },
    })

    expect(screen.getByLabelText('V[0]')).toHaveAttribute('x1', '392')
    expect(screen.getByLabelText('V[1]')).toHaveAttribute('x1', '248')
    expect(
      screen.queryByRole('textbox', { name: 'Position 3' }),
    ).not.toBeInTheDocument()

    const inspectionToggle = screen.getByRole('button', {
      name: 'List (2)',
    })
    expect(inspectionToggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(inspectionToggle)

    const details = screen.getByRole('list', { name: 'Elements of V' })
    const elements = within(details).getAllByRole('listitem')
    expect(elements).toHaveLength(2)
    expect(within(elements[0]).getByLabelText('Element 0')).toHaveTextContent('0')
    expect(elements[0]).toHaveTextContent('Vector')
    expect(elements[0]).toHaveTextContent('e1')
    expect(elements[0]).toHaveTextContent('position (1, 2)')
    expect(elements[1]).toHaveTextContent('Vector')
    expect(elements[1]).toHaveTextContent('e2')
    expect(elements[1]).toHaveTextContent('position (-1, 3)')
  })
  it('edits an expression and exposes its value and SVG vector in text', () => {
    render(<App />)

    expect(
      screen.getByRole('complementary', { name: 'Expressions' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Source')).not.toBeInTheDocument()
    expect(screen.queryByText('Standard interpretation')).not.toBeInTheDocument()
    expect(screen.queryByText('VGA 2D viewport')).not.toBeInTheDocument()
    expect(screen.getByText('2e1 + e2')).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: /Two-dimensional VGA viewport/,
      }),
    ).toHaveTextContent('Vector 1 runs from the origin to 2, 1.')
  })

  it('navigates the persistent viewport without creating mathematical history', () => {
    const { container } = render(<App />)
    const canvas = screen.getByRole('img', { name: /Two-dimensional VGA viewport/ })
    const vector = screen.getByLabelText('Vector 1')
    const undo = screen.getByRole('button', { name: 'Undo document change' })

    expect(vector).toHaveAttribute('x1', '320')
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(Number(vector.getAttribute('x2'))).toBeGreaterThan(480)
    expect(Number(vector.getAttribute('x2'))).toBeLessThan(500)
    expect(container.querySelector('.vector-arrowhead'))
      .toHaveAttribute('points', expect.stringMatching(/^500,/))
    expect(screen.getByText('125%')).toBeInTheDocument()
    expect(undo).toBeDisabled()

    fireEvent.pointerDown(canvas, { button: 0, pointerId: 1, clientX: 320, clientY: 240 })
    expect(canvas).toHaveFocus()
    fireEvent.keyDown(canvas, { key: 'ArrowLeft' })
    expect(vector).toHaveAttribute('x1', '360')
    fireEvent.keyDown(canvas, { key: 'Home' })
    expect(vector).toHaveAttribute('x1', '320')
    expect(screen.getByText('100%', { selector: 'output' })).toBeInTheDocument()

    openDisplaySettings()
    const grid = screen.getByRole('switch', { name: 'Grid' })
    expect(grid).toBeChecked()
    expect(container.querySelectorAll('.grid-line').length).toBeGreaterThan(0)
    fireEvent.click(grid)
    expect(container.querySelectorAll('.grid-line')).toHaveLength(0)
    expect(undo).toBeDisabled()
  })

  it('locks mouse and keyboard navigation, then restores it after unlocking', () => {
    render(<App />)
    const canvas = viewportCanvas()
    sizeViewportCanvas(canvas)
    const vector = screen.getByLabelText('Vector 1')
    const lock = screen.getByRole('button', { name: 'Lock viewport' })

    fireEvent.click(lock)
    expect(screen.getByRole('button', { name: 'Unlock viewport' }))
      .toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Viewport locked.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reset view' })).toBeDisabled()

    fireEvent.wheel(canvas, { deltaY: -200, clientX: 320, clientY: 240 })
    fireEvent.keyDown(canvas, { key: 'ArrowLeft' })
    fireEvent.pointerDown(canvas, { button: 0, pointerId: 4, clientX: 320, clientY: 240 })
    fireEvent.pointerMove(canvas, { pointerId: 4, clientX: 400, clientY: 240 })
    fireEvent.pointerUp(canvas, { pointerId: 4 })
    expect(vector).toHaveAttribute('x1', '320')
    expect(screen.getByText('100%', { selector: 'output' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Unlock viewport' }))
    expect(screen.getByText('Viewport unlocked.')).toBeInTheDocument()
    fireEvent.keyDown(canvas, { key: 'ArrowLeft' })
    expect(vector).toHaveAttribute('x1', '360')
  })

  it('keeps direct object manipulation available while the viewport is locked', () => {
    render(<App />)
    const source = screen.getByRole('textbox', { name: 'Expression 1' })
    fireEvent.change(source, { target: { value: 'V = vector(2, 1)' } })
    const canvas = viewportCanvas()
    sizeViewportCanvas(canvas)
    fireEvent.click(screen.getByRole('button', { name: 'Lock viewport' }))

    const head = screen.getByRole('button', { name: 'Move head of V' })
    fireEvent.pointerDown(head, { button: 0, pointerId: 12 })
    fireEvent.pointerMove(canvas, { pointerId: 12, clientX: 536, clientY: 96 })
    fireEvent.pointerUp(canvas, { pointerId: 12 })

    expect(source).toHaveValue('V = vector(3, 2)')
  })

  it('restores the viewport lock locally without adding it to document history', () => {
    const first = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Lock viewport' }))
    expect(screen.getByRole('button', { name: 'Undo document change' })).toBeDisabled()
    first.unmount()

    render(<App />)
    expect(screen.getByRole('button', { name: 'Unlock viewport' }))
      .toHaveAttribute('aria-pressed', 'true')
  })

  it('creates a collision-free vector from empty viewport coordinates as one history entry', () => {
    render(<App />)
    const first = screen.getByRole('textbox', { name: 'Expression 1' })
    fireEvent.change(first, { target: { value: 'V1 = vector(2, 1)' } })
    const canvas = viewportCanvas()
    sizeViewportCanvas(canvas)

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    fireEvent.doubleClick(canvas, { clientX: 410, clientY: 150 })

    const created = screen.getByRole('textbox', { name: 'Expression 2' })
    expect(created).toHaveValue('V2 = vector(1, 1)')
    expect(created).toHaveFocus()
    expect(screen.getByText('V2 created at 1, 1.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Undo document change' }))
    expect(screen.queryByRole('textbox', { name: 'Expression 2' }))
      .not.toBeInTheDocument()
    expect(canvas).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: 'Redo document change' }))
    expect(screen.getByRole('textbox', { name: 'Expression 2' })).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'Expression 2' }))
      .toHaveValue('V2 = vector(1, 1)')
  })

  it('does not create or select when an existing rendered object is double-clicked', () => {
    render(<App />)
    const vector = screen.getByLabelText('Vector 1')

    fireEvent.doubleClick(vector, { clientX: 400, clientY: 200 })

    expect(screen.queryByRole('textbox', { name: 'Expression 2' }))
      .not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo document change' }))
      .toBeDisabled()
    expect(vector).not.toHaveAttribute('role', 'button')
    expect(vector).not.toHaveAttribute('aria-selected')
  })

  it('moves a direct vector head as one undoable source edit', () => {
    render(<App />)
    const source = screen.getByRole('textbox', { name: 'Expression 1' })
    fireEvent.change(source, { target: { value: 'V = vector(2, 1)' } })
    const canvas = viewportCanvas()
    sizeViewportCanvas(canvas)
    const head = screen.getByRole('button', { name: 'Move head of V' })

    fireEvent.pointerDown(head, { button: 0, pointerId: 7 })
    fireEvent.pointerMove(canvas, { pointerId: 7, clientX: 536, clientY: 96 })
    fireEvent.pointerUp(canvas, { pointerId: 7 })

    expect(source).toHaveValue('V = vector(3, 2)')
    fireEvent.click(screen.getByRole('button', { name: 'Undo document change' }))
    expect(source).toHaveValue('V = vector(2, 1)')
  })

  it('renders the vector arrowhead with Studio screen-space geometry', () => {
    const { container } = render(<App />)
    const vector = screen.getByLabelText('Vector 1')
    const arrowhead = container.querySelector('.vector-arrowhead')

    expect(vector).not.toHaveAttribute('marker-end')
    expect(arrowhead).toHaveAttribute('points', expect.stringMatching(/^464,168 /))
    expect(arrowhead?.getAttribute('points')?.trim().split(/\s+/)).toHaveLength(3)
  })

  it('shows a head dot only for a draggable vector head', () => {
    const { container } = render(<App />)
    const source = screen.getByRole('textbox', { name: 'Expression 1' })
    fireEvent.change(source, { target: { value: 'V = vector(2, 1)' } })
    expect(container.querySelector('.vector-head-point')).toBeInTheDocument()

    fireEvent.change(source, { target: { value: 'V = vector(1 + 1, 1)' } })
    expect(container.querySelector('.vector-head-point')).not.toBeInTheDocument()
  })

  it('cancels vector manipulation through Escape without adding history', () => {
    render(<App />)
    const source = screen.getByRole('textbox', { name: 'Expression 1' })
    fireEvent.change(source, { target: { value: 'V = vector(2, 1)' } })
    const canvas = viewportCanvas()
    sizeViewportCanvas(canvas)
    const head = screen.getByRole('button', { name: 'Move head of V' })

    fireEvent.pointerDown(head, { button: 0, pointerId: 9 })
    fireEvent.pointerMove(canvas, { pointerId: 9, clientX: 536, clientY: 96 })
    expect(source).toHaveValue('V = vector(3, 2)')
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(source).toHaveValue('V = vector(2, 1)')
    expect(screen.getByText('Object manipulation cancelled.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Undo document change' }))
    expect(source).toHaveValue('vector(2, 1)')
  })

  it('moves a vector head through an eligible direct scalar reference', () => {
    render(<App />)
    const scalar = screen.getByRole('textbox', { name: 'Expression 1' })
    fireEvent.change(scalar, { target: { value: 's = 2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add expression' }))
    const vector = screen.getByRole('textbox', { name: 'Expression 2' })
    fireEvent.change(vector, { target: { value: 'V1 = vector(s, 1)' } })
    const head = screen.getByRole('button', { name: 'Move head of V1' })

    fireEvent.keyDown(head, { key: 'ArrowRight' })

    expect(scalar).toHaveValue('s = 2.1')
    expect(vector).toHaveValue('V1 = vector(s, 1)')
    fireEvent.click(screen.getByRole('button', { name: 'Undo document change' }))
    expect(scalar).toHaveValue('s = 2')
  })

  it('moves vector and bivector bases without changing their values', () => {
    render(<App />)
    const vectorSource = screen.getByRole('textbox', { name: 'Expression 1' })
    fireEvent.change(vectorSource, { target: { value: 'V = vector(2, 1)' } })
    const canvas = viewportCanvas()
    sizeViewportCanvas(canvas)

    const vectorBase = screen.getByRole('button', { name: 'Move base of V' })
    fireEvent.pointerDown(vectorBase, { button: 0, pointerId: 8 })
    fireEvent.pointerMove(canvas, { pointerId: 8, clientX: 392, clientY: 168 })
    fireEvent.pointerUp(canvas, { pointerId: 8 })
    expect(vectorSource).toHaveValue('V = vector(2, 1)')
    expect(screen.getByRole('textbox', { name: 'Position 1' }))
      .toHaveValue('(1, 1)')

    fireEvent.change(vectorSource, { target: { value: 'B = 2e12' } })
    const bivectorBase = screen.getByRole('button', { name: 'Move base of B' })
    fireEvent.keyDown(bivectorBase, { key: 'ArrowRight' })
    expect(screen.getByRole('textbox', { name: 'Position 1' }))
      .toHaveValue('(1.1, 1)')
    expect(vectorSource).toHaveValue('B = 2e12')
  })

  it('snaps a vector base to a named vector head and unlinks it by dragging away', () => {
    const { container } = render(<App />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 1' }), {
      target: { value: 'V = vector(2, 1)' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add expression' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 2' }), {
      target: { value: 'W = vector(1, 0)' },
    })
    const canvas = viewportCanvas()
    sizeViewportCanvas(canvas)
    const base = screen.getByRole('button', { name: 'Move base of W' })

    fireEvent.pointerDown(base, { button: 0, pointerId: 21 })
    fireEvent.pointerMove(canvas, { pointerId: 21, clientX: 464, clientY: 168 })
    expect(container.querySelector('.anchor-preview')).toBeInTheDocument()
    fireEvent.pointerUp(canvas, { pointerId: 21 })

    expect(screen.getByRole('textbox', { name: 'Position 2' })).toHaveValue('V.head')
    expect(screen.getByText('Object base linked to V head.')).toBeInTheDocument()
    expect(screen.getByLabelText('W')).toHaveAttribute('x1', '464')
    fireEvent.click(screen.getByRole('button', { name: 'Undo document change' }))
    expect(screen.getByRole('textbox', { name: 'Position 2' })).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Redo document change' }))
    expect(screen.getByRole('textbox', { name: 'Position 2' })).toHaveValue('V.head')

    fireEvent.pointerDown(base, { button: 0, pointerId: 22 })
    fireEvent.pointerMove(canvas, { pointerId: 22, clientX: 392, clientY: 168 })
    fireEvent.pointerUp(canvas, { pointerId: 22 })

    expect(screen.getByRole('textbox', { name: 'Position 2' })).toHaveValue('(1, 1)')
    expect(container.querySelector('.anchor-preview')).not.toBeInTheDocument()
  })

  it('snaps a vector base to a named bivector position', () => {
    render(<App />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 1' }), {
      target: { value: 'B = e12' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Position 1' }), {
      target: { value: '(1, 1)' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add expression' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 2' }), {
      target: { value: 'V = vector(1, 0)' },
    })
    const canvas = viewportCanvas()
    sizeViewportCanvas(canvas)

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Move base of V' }), {
      button: 0, pointerId: 23,
    })
    fireEvent.pointerMove(canvas, { pointerId: 23, clientX: 392, clientY: 168 })
    fireEvent.pointerUp(canvas, { pointerId: 23 })

    expect(screen.getByRole('textbox', { name: 'Position 2' })).toHaveValue('B.position')
    expect(screen.getByText('Object base linked to B position.')).toBeInTheDocument()
  })

  it('moves a bivector base without snapping to vectors that inherit its position', () => {
    const { container } = render(<App />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 1' }), {
      target: { value: 'V1 = vector(0.66, 3.042)' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Position 1' }), {
      target: { value: 'V2.position' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add expression' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 2' }), {
      target: { value: 'V2 = vector(1, 0)' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Position 2' }), {
      target: { value: 'B.position' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add expression' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 3' }), {
      target: { value: 'B = V1 ^ V2' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Position 3' }), {
      target: { value: '(0, 0)' },
    })
    const canvas = viewportCanvas()
    sizeViewportCanvas(canvas)

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Move base of B' }), {
      button: 0, pointerId: 24,
    })
    fireEvent.pointerMove(canvas, { pointerId: 24, clientX: 392, clientY: 168 })
    expect(container.querySelector('.anchor-preview')).not.toBeInTheDocument()
    fireEvent.pointerUp(canvas, { pointerId: 24 })

    expect(screen.getByRole('textbox', { name: 'Position 3' })).toHaveValue('(1, 1)')
    expect(screen.getByText('Object manipulation committed.')).toBeInTheDocument()
  })

  it('cycles anchor targets and unlinks from a vector base with the keyboard', () => {
    render(<App />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 1' }), {
      target: { value: 'V = vector(2, 1)' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add expression' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 2' }), {
      target: { value: 'W = vector(1, 0)' },
    })
    const base = screen.getByRole('button', { name: 'Move base of W' })
    expect(base).toHaveAttribute('aria-keyshortcuts', 'Enter Delete')

    fireEvent.keyDown(base, { key: 'Enter' })
    expect(screen.getByRole('textbox', { name: 'Position 2' })).toHaveValue('V.position')
    fireEvent.keyDown(base, { key: 'Enter' })
    expect(screen.getByRole('textbox', { name: 'Position 2' })).toHaveValue('V.head')
    fireEvent.keyDown(base, { key: 'Delete' })
    expect(screen.getByRole('textbox', { name: 'Position 2' })).toHaveValue('(2, 1)')
    expect(screen.getByText('Object base unlinked and kept at its resolved position.'))
      .toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Undo document change' }))
    expect(screen.getByRole('textbox', { name: 'Position 2' })).toHaveValue('V.head')
  })

  it('refuses a keyboard anchor that would create a position cycle', () => {
    render(<App />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 1' }), {
      target: { value: 'A = vector(1, 0)' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Position 1' }), {
      target: { value: 'B.head' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add expression' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 2' }), {
      target: { value: 'B = vector(0, 1)' },
    })

    fireEvent.keyDown(screen.getByRole('button', { name: 'Move base of B' }), {
      key: 'Enter',
    })

    expect(screen.getByRole('textbox', { name: 'Position 2' })).toHaveValue('')
    expect(screen.getByText('No valid anchor target is available.')).toBeInTheDocument()
  })

  it('keeps a vector base draggable through an overlapping bivector area', () => {
    const { container } = render(<App />)
    const vectorSource = screen.getByRole('textbox', { name: 'Expression 1' })
    fireEvent.change(vectorSource, { target: { value: 'V = vector(2, 1)' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add expression' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 2' }), {
      target: { value: 'B = 4e12' },
    })
    const canvas = viewportCanvas()
    sizeViewportCanvas(canvas)
    const bivector = container.querySelector('.bivector')

    expect(bivector).toHaveAttribute('pointer-events', 'none')
    const vectorBase = screen.getByRole('button', { name: 'Move base of V' })
    fireEvent.pointerDown(vectorBase, { button: 0, pointerId: 18 })
    fireEvent.pointerMove(canvas, { pointerId: 18, clientX: 392, clientY: 168 })
    fireEvent.pointerUp(canvas, { pointerId: 18 })

    expect(screen.getByRole('textbox', { name: 'Position 1' })).toHaveValue('(1, 1)')
    expect(vectorSource).toHaveValue('V = vector(2, 1)')
    expect(screen.getByRole('button', { name: 'Move base of B' })).toBeInTheDocument()
  })

  it('keeps locked bases as solid points and gives list copies no handles', () => {
    const { container } = render(<App />)
    const source = screen.getByRole('textbox', { name: 'Expression 1' })
    const position = screen.getByRole('textbox', { name: 'Position 1' })
    fireEvent.change(source, { target: { value: 'V = vector(1 + 1, 2)' } })
    fireEvent.change(position, { target: { value: '(1 / 2, 0)' } })

    expect(screen.queryByRole('button', { name: 'Move head of V' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Move base of V' }))
      .not.toBeInTheDocument()
    expect(container.querySelector('.manipulation-base-point')).toBeInTheDocument()
    expect(container.querySelector('.manipulation-base-contour.is-movable'))
      .not.toBeInTheDocument()

    fireEvent.change(source, {
      target: { value: 'L = [vector(1, 0), vector(0, 1)]' },
    })
    expect(container.querySelector('.manipulation-base-point')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Move (?:head|base)/ }))
      .not.toBeInTheDocument()
  })

  it('controls axes, graduations, and object scale independently', () => {
    const { container } = render(<App />)
    expect(container.querySelectorAll('.axis')).toHaveLength(2)
    expect(container.querySelectorAll('.graduation').length).toBeGreaterThan(0)
    openDisplaySettings()
    expect(screen.getByText('1.00×')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('switch', { name: 'Axes and labels' }))
    expect(container.querySelectorAll('.axis')).toHaveLength(0)
    expect(container.querySelectorAll('.graduation').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('switch', { name: 'Graduations' }))
    expect(container.querySelectorAll('.graduation')).toHaveLength(0)

    fireEvent.change(screen.getByRole('slider', { name: 'Object scale' }), {
      target: { value: '1.5' },
    })
    expect(screen.getByLabelText('Vector 1')).toHaveAttribute('stroke-width', '9')
    expect(screen.getByText('1.50×')).toBeInTheDocument()
  })

  it('configures a direct scalar slider that rewrites source and supports undo', () => {
    render(<App />)
    const source = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Expression 1',
    })
    source.focus()
    fireEvent.change(source, { target: { value: 'a = ((2))' } })
    expect(screen.getByRole('slider', { name: 'Value for a' })).toBeEnabled()
    expect(screen.getByRole('textbox', { name: 'Minimum source' }))
      .toHaveValue('-10')
    fireEvent.blur(source)
    expect(screen.getByRole('textbox', { name: 'Minimum source' }))
      .toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Maximum source' }))
      .toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Step source' }))
      .toBeVisible()
    const trigger = screen.getByRole('button', {
      name: 'Open Scalar menu for a',
    })
    expect(trigger.parentElement?.firstElementChild)
      .toHaveClass('scalar-play-button')

    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Scalar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close Scalar menu' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Slider' }))
      .toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('textbox', { name: 'Minimum source' }))
      .toHaveValue('-10')
    const slider = screen.getByRole('slider', { name: 'Value for a' })
    expect(slider).toBeEnabled()

    fireEvent.pointerDown(slider, { pointerId: 1 })
    fireEvent.change(slider, { target: { value: '3' } })
    fireEvent.change(slider, { target: { value: '3.5' } })
    fireEvent.pointerUp(slider, { pointerId: 1 })
    expect(source).toHaveValue('a = ((3.5))')

    fireEvent.click(screen.getByRole('button', { name: 'Undo document change' }))
    expect(source).toHaveValue('a = ((2))')

    fireEvent.click(screen.getByRole('button', { name: 'Number' }))
    expect(trigger.parentElement?.firstElementChild)
      .toHaveClass('expression-action-spacer')
    expect(screen.queryByRole('slider', { name: 'Value for a' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Play scalar animation' }))
      .not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Minimum source' }))
      .not.toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Scalar' }))
      .not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('preserves unsupported or out-of-range scalar source without clamping', () => {
    render(<App />)
    const source = screen.getByRole('textbox', { name: 'Expression 1' })
    fireEvent.change(source, { target: { value: 'a = 20' } })
    fireEvent.click(screen.getByRole('button', {
      name: 'Open Scalar menu for a',
    }))

    expect(screen.getByRole('slider', { name: 'Value for a' })).toBeDisabled()
    expect(screen.getByText('Value is outside the configured interval.'))
      .toBeInTheDocument()
    expect(source).toHaveValue('a = 20')

    fireEvent.change(screen.getByRole('textbox', { name: 'Minimum source' }), {
      target: { value: 'e1' },
    })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'A control bound must evaluate to a pure scalar.',
    )
    expect(source).toHaveValue('a = 20')
  })

  it('plays scalar animation as one transaction and cancels through Escape', () => {
    vi.useFakeTimers()
    render(<App />)
    const source = screen.getByRole<HTMLInputElement>('textbox', {
      name: 'Expression 1',
    })
    fireEvent.change(source, { target: { value: 'a = 2' } })
    fireEvent.click(screen.getByRole('button', {
      name: 'Open Scalar menu for a',
    }))
    fireEvent.click(screen.getByRole('button', { name: 'Loop' }))
    expect(screen.getByRole('button', { name: 'Loop' }))
      .toHaveAttribute('aria-pressed', 'true')

    const play = screen.getByRole('button', { name: 'Play scalar animation' })
    fireEvent.click(play)
    act(() => vi.advanceTimersByTime(1000))
    expect(source).not.toHaveValue('a = 2')
    expect(screen.getByRole('button', { name: 'Pause scalar animation' }))
      .toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Pause scalar animation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Undo document change' }))
    expect(source).toHaveValue('a = 2')

    fireEvent.click(screen.getByRole('button', { name: 'Play scalar animation' }))
    act(() => vi.advanceTimersByTime(500))
    expect(source).not.toHaveValue('a = 2')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(source).toHaveValue('a = 2')
    expect(screen.getByText('Scalar animation cancelled.')).toBeInTheDocument()
  })

  it('opens display settings, restores focus on close, and records no history', () => {
    render(<App />)
    const undo = screen.getByRole('button', { name: 'Undo document change' })
    expect(screen.queryByRole('switch', { name: 'Grid' })).not.toBeInTheDocument()

    const trigger = openDisplaySettings()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('switch', { name: 'Grid' })).toHaveFocus()
    expect(screen.getByRole('spinbutton', { name: 'Decimal places' }))
      .toHaveValue(4)

    fireEvent.click(screen.getByRole('switch', { name: 'Grid' }))
    expect(undo).toBeDisabled()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('switch', { name: 'Grid' })).not.toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()

    openDisplaySettings()
    const outsideControl = screen.getByRole('button', { name: 'Add expression' })
    fireEvent.pointerDown(outsideControl)
    expect(screen.queryByRole('switch', { name: 'Grid' })).not.toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('changes numeric presentation without changing source, value kind, or history', () => {
    render(<App />)
    const source = screen.getByRole('textbox', { name: 'Expression 1' })
    fireEvent.change(source, {
      target: { value: 'R = -1 + 0.0000000035897930298416118e12' },
    })
    expect(screen.getByText('Rotor')).toBeInTheDocument()
    expect(screen.getByText('-1 + 3.5898E-9e12')).toBeInTheDocument()

    const undo = screen.getByRole('button', { name: 'Undo document change' })
    fireEvent.click(undo)
    expect(source).toHaveValue('vector(2, 1)')
    fireEvent.change(source, {
      target: { value: 'R = -1 + 0.0000000035897930298416118e12' },
    })
    openDisplaySettings()
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Decimal places' }), {
      target: { value: '2' },
    })

    expect(source).toHaveValue('R = -1 + 0.0000000035897930298416118e12')
    expect(screen.getByText('Rotor')).toBeInTheDocument()
    expect(screen.getByText('-1 + 3.59E-9e12')).toBeInTheDocument()
    fireEvent.click(undo)
    expect(source).toHaveValue('vector(2, 1)')
  })

  it('shows a textual, source-associated diagnostic and removes stale output', () => {
    render(<App />)

    const input = screen.getByRole('textbox', {
      name: 'Expression 1',
    })
    fireEvent.change(input, { target: { value: 'vector(2)' } })

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Expected “,” between vector components.',
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Source characters')
    expect(screen.queryByText('2e1 + e2')).not.toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveTextContent('No spatial objects are visible')
  })

  it('recovers immediately when invalid source is corrected', () => {
    render(<App />)

    const input = screen.getByRole('textbox', {
      name: 'Expression 1',
    })
    fireEvent.change(input, { target: { value: 'nope' } })
    fireEvent.change(input, { target: { value: 'vector(-3, 4)' } })

    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByText('-3e1 + 4e2')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveTextContent(
      'Vector 1 runs from the origin to -3, 4.',
    )
  })

  it('interprets equivalent zero expressions as the same scalar value', () => {
    render(<App />)

    const input = screen.getByRole('textbox', { name: 'Expression 1' })
    fireEvent.change(input, { target: { value: 'vector(0, 0)' } })

    expect(screen.getByText('0', { selector: 'output' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Vector 1')).not.toBeInTheDocument()

    fireEvent.change(input, { target: { value: '0' } })

    expect(screen.getByText('0', { selector: 'output' })).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveTextContent('No spatial objects are visible')
  })

  it('evaluates a nonzero scalar without treating it as invalid', () => {
    render(<App />)

    const input = screen.getByRole('textbox', { name: 'Expression 1' })
    fireEvent.change(input, { target: { value: '12' } })

    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByText('12', { selector: 'output' })).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveTextContent('No spatial objects are visible')
  })

  it('shows gray and error pastilles for empty and invalid expressions', () => {
    const { container } = render(<App />)
    const expression = screen.getByRole('textbox', { name: 'Expression 1' })

    fireEvent.change(expression, { target: { value: '' } })
    expect(screen.queryByText(/Enter an expression/)).not.toBeInTheDocument()
    expect(container.querySelector('.expression-status-pastille.is-empty'))
      .toBeInTheDocument()

    fireEvent.change(expression, { target: { value: 'Missing' } })
    expect(expression).toHaveAttribute('aria-invalid', 'true')
    expect(container.querySelector('.expression-status-pastille.is-error'))
      .toBeInTheDocument()
  })

  it('offers color-only appearance for a scalar', () => {
    render(<App />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 1' }), {
      target: { value: '12' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open Scalar menu for Scalar' }))

    expect(screen.getByRole('dialog', { name: 'Scalar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use color green 4' })).toBeInTheDocument()
    expect(screen.queryByText('Visibility')).not.toBeInTheDocument()
    expect(screen.queryByText('Show label')).not.toBeInTheDocument()
  })

  it('accepts basis-blade notation through the same visual workflow', () => {
    render(<App />)

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Expression 1' }),
      { target: { value: 'e1 + 2e2' } },
    )

    expect(
      screen.getByText('e1 + 2e2', { selector: 'output' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveTextContent(
      'Vector 1 runs from the origin to 1, 2.',
    )
  })

  it('shows a minimal object kind above the canonical value', () => {
    render(<App />)

    const input = screen.getByRole('textbox', { name: 'Expression 1' })
    fireEvent.change(input, { target: { value: '12 + 2e1 + 80e12' } })

    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(
      screen.getByText('12 + 2e1 + 80e12', { selector: 'output' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Mixed multivector')).toBeInTheDocument()
  })

  it('adds independent expressions and renders their vectors in list order', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Add expression' }))
    const second = screen.getByRole('textbox', { name: 'Expression 2' })
    fireEvent.change(second, { target: { value: 'vector(-1, 2)' } })

    expect(screen.getAllByLabelText(/^Vector [12]$/)).toHaveLength(2)
    expect(screen.getByRole('img')).toHaveTextContent(
      '2 vectors and 0 bivectors are visible.',
    )
    expect(screen.getByRole('img')).toHaveTextContent(
      'Vector 2 runs from the origin to -1, 2.',
    )
  })

  it('re-evaluates named expressions and their transitive dependents', () => {
    render(<App />)

    const first = screen.getByRole('textbox', { name: 'Expression 1' })
    fireEvent.change(first, { target: { value: 'V1 = vector(1, 1)' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add expression' }))
    const second = screen.getByRole('textbox', { name: 'Expression 2' })
    fireEvent.change(second, { target: { value: 'V2 = vector(2, 1)' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add expression' }))
    const third = screen.getByRole('textbox', { name: 'Expression 3' })
    fireEvent.change(third, { target: { value: 'B = V1 * V2' } })

    expect(screen.getByText('3 - e12', { selector: 'output' })).toBeInTheDocument()
    expect(screen.getByLabelText('V1')).toBeInTheDocument()
    expect(screen.getByLabelText('V2')).toBeInTheDocument()

    fireEvent.change(first, { target: { value: 'V1 = vector(3, 0)' } })

    expect(screen.getByText('6 + 3e12', { selector: 'output' })).toBeInTheDocument()
  })

  it('shows document-level undefined-name diagnostics', () => {
    render(<App />)

    const input = screen.getByRole('textbox', { name: 'Expression 1' })
    fireEvent.change(input, { target: { value: 'B = Missing * e1' } })

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('LANG_UNDEFINED_NAME')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The name “Missing” is not defined.',
    )
  })

  it('edits a separate position source and renders translated endpoints', () => {
    render(<App />)

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Expression 1' }),
      { target: { value: 'V = vector(2, 1)' } },
    )
    const position = screen.getByRole('textbox', { name: 'Position 1' })
    expect(position).toHaveAttribute('placeholder', '(0, 0)')
    fireEvent.change(position, { target: { value: '(-1, 2)' } })

    expect(position).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByText('Position: -e1 + 2e2')).not.toBeInTheDocument()
    expect(screen.queryByText('Head: e1 + 3e2')).not.toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveTextContent(
      'V runs from -1, 2 to 1, 3.',
    )
    expect(screen.getByLabelText('V')).toHaveAttribute('x1', '248')
    expect(screen.getByLabelText('V')).toHaveAttribute('y1', '96')
  })

  it('hides a rendered object without changing its evaluated text', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Hide Vector' }))

    expect(screen.getByText('2e1 + e2', { selector: 'output' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show Vector' })).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveTextContent('No spatial objects are visible')
  })

  it('applies deterministic default styles per semantic object kind', () => {
    render(<App />)
    const expression = screen.getByRole('textbox', { name: 'Expression 1' })

    expect(screen.getByText('Vector')).toHaveStyle({ color: '#E8A000' })

    fireEvent.change(expression, { target: { value: 'e1 ^ e2' } })
    expect(screen.getByText('Bivector')).toHaveStyle({ color: '#C30A3A' })

    fireEvent.change(expression, { target: { value: '3' } })
    expect(screen.getByText('Scalar')).toHaveStyle({ color: '#0F9D57' })
  })

  it('edits common color and label appearance independently of the value', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Open Vector menu for Vector' }))
    expect(screen.getByRole('dialog', { name: 'Vector' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Use color green 4' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Show label' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Text' }), {
      target: { value: 'Velocity' },
    })

    expect(screen.getByText('2e1 + e2', { selector: 'output' })).toBeInTheDocument()
    expect(screen.getByText('Velocity', { selector: 'text' })).toBeInTheDocument()
    expect(screen.getByText('Vector', { selector: '.object-kind' }))
      .toHaveStyle({ color: '#0F9D57' })
  })

  it('renders bivectors without a border by default and enables it from appearance', () => {
    const { container } = render(<App />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 1' }), {
      target: { value: 'B = e1 ^ e2' },
    })
    const bivector = container.querySelector('.bivector')
    expect(bivector).not.toHaveClass('has-border')
    expect(container.querySelector('.bivector-orientation')).toBeInTheDocument()
    expect(bivector).not.toHaveAttribute('marker-end')

    fireEvent.click(screen.getByRole('button', { name: 'Open Bivector menu for B' }))
    expect(screen.getByRole('button', { name: 'From vectors' })).toBeDisabled()
    const border = screen.getByRole('switch', { name: 'Border hidden' })
    fireEvent.click(border)

    expect(screen.getByRole('switch', { name: 'Border visible' })).toBeChecked()
    expect(bivector).toHaveClass('has-border')

    fireEvent.click(screen.getByRole('switch', { name: 'Orientation visible' }))
    expect(screen.getByRole('switch', { name: 'Orientation hidden' })).not.toBeChecked()
    expect(container.querySelector('.bivector-orientation')).not.toBeInTheDocument()
  })

  it('selects visual bivector shapes while preserving construction availability', () => {
    const { container } = render(<App />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 1' }), {
      target: { value: 'V = vector(2, 0)' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add expression' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 2' }), {
      target: { value: 'W = vector(0, 2)' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add expression' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 3' }), {
      target: { value: 'B = V ^ W' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Open Bivector menu for B' }))

    const fromVectors = screen.getByRole('button', { name: 'From vectors' })
    expect(fromVectors).toBeEnabled()
    expect(fromVectors).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelector('.bivector')).toHaveAttribute('d', expect.stringContaining('L'))

    fireEvent.click(screen.getByRole('button', { name: 'Disk' }))
    expect(screen.getByRole('button', { name: 'Disk' })).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelector('.bivector')).toHaveAttribute('d', expect.stringContaining('A'))

    fireEvent.click(screen.getByRole('button', { name: 'Square' }))
    expect(screen.getByRole('button', { name: 'Square' })).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelector('.bivector')).toHaveAttribute('d', expect.stringContaining('H'))
  })

  it('restores the declared name when the label text is cleared', () => {
    render(<App />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 1' }), {
      target: { value: 'V = vector(2, 1)' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Open Vector menu for V' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Show label' }))

    const label = screen.getByRole('textbox', { name: 'Text' })
    fireEvent.change(label, { target: { value: 'Velocity' } })
    expect(screen.getByText('Velocity', { selector: 'text' })).toBeInTheDocument()

    fireEvent.change(label, { target: { value: '' } })

    expect(label).toHaveValue('')
    expect(screen.getByText('V', { selector: 'text' })).toBeInTheDocument()
  })

  it('keeps focus in the label field while its text changes', () => {
    render(<App />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 1' }), {
      target: { value: 'V = vector(2, 1)' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Open Vector menu for V' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Show label' }))
    const label = screen.getByRole('textbox', { name: 'Text' })

    label.focus()
    fireEvent.change(label, { target: { value: 'V' } })
    expect(label).toHaveFocus()
    fireEvent.change(label, { target: { value: 'Ve' } })
    expect(label).toHaveFocus()
  })

  it('returns focus to the swatch when the appearance popover closes', () => {
    render(<App />)
    const swatch = screen.getByRole('button', { name: 'Open Vector menu for Vector' })

    fireEvent.click(swatch)
    fireEvent.click(screen.getByRole('button', { name: 'Close Vector menu' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(swatch).toHaveFocus()
  })

  it('closes appearance with Escape and restores focus without a keyboard trap', () => {
    render(<App />)
    const swatch = screen.getByRole('button', {
      name: 'Open Vector menu for Vector',
    })

    fireEvent.click(swatch)
    expect(screen.getByRole('dialog', { name: 'Vector' }))
      .toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Visible' })).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(swatch).toHaveFocus()
  })

  it('closes an expression menu when the canvas is clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Open Vector menu for Vector' }))
    expect(screen.getByRole('dialog', { name: 'Vector' })).toBeInTheDocument()

    fireEvent.pointerDown(viewportCanvas(), {
      button: 0, pointerId: 1, clientX: 320, clientY: 240,
    })

    expect(screen.queryByRole('dialog', { name: 'Vector' })).not.toBeInTheDocument()
  })

  it('offers system, light, and dark application themes', () => {
    render(<App />)
    openDisplaySettings()
    const theme = screen.getByRole('combobox', { name: 'Theme' })

    fireEvent.change(theme, { target: { value: 'dark' } })
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')

    fireEvent.change(theme, { target: { value: 'light' } })
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('toggles natural VGA normalization without rewriting the expression', () => {
    render(<App />)
    const expression = screen.getByRole('textbox', { name: 'Expression 1' })
    const normalize = screen.getByRole('button', { name: 'norm' })

    fireEvent.click(normalize)
    expect(normalize).toHaveAttribute('aria-pressed', 'true')
    expect(expression).toHaveValue('vector(2, 1)')
    expect(screen.queryByText('2e1 + e2', { selector: 'output' })).not.toBeInTheDocument()

    fireEvent.click(normalize)
    expect(screen.getByText('2e1 + e2', { selector: 'output' })).toBeInTheDocument()
  })

  it('offers normalization for rotors and mixed multivectors but not scalars', () => {
    render(<App />)
    const expression = screen.getByRole('textbox', { name: 'Expression 1' })

    fireEvent.change(expression, { target: { value: 'R = 2 + e12' } })
    const rotorNormalize = screen.getByRole('button', { name: 'norm' })
    fireEvent.click(rotorNormalize)
    expect(rotorNormalize).toHaveAttribute('aria-pressed', 'true')
    expect(expression).toHaveValue('R = 2 + e12')

    fireEvent.change(expression, { target: { value: 'M = 1 + e1' } })
    const mixedNormalize = screen.getByRole('button', { name: 'norm' })
    expect(mixedNormalize).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Normalization unavailable')).toBeInTheDocument()
    expect(screen.getByText(/zero natural norm/)).toBeInTheDocument()

    fireEvent.change(expression, { target: { value: 's = 2' } })
    expect(screen.queryByRole('button', { name: 'norm' })).not.toBeInTheDocument()
  })

  it('marks unit-norm multivectors independently of the normalization toggle', () => {
    render(<App />)
    const expression = screen.getByRole('textbox', { name: 'Expression 1' })
    const normalize = screen.getByRole('button', { name: 'norm' })

    expect(normalize).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByText('Unit norm')).not.toBeInTheDocument()

    fireEvent.change(expression, { target: { value: 'V = e1' } })
    expect(screen.getByText('Unit norm')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'norm' })).toHaveAttribute('aria-pressed', 'false')

    fireEvent.change(expression, { target: { value: 'V = 2*e1' } })
    expect(screen.queryByText('Unit norm')).not.toBeInTheDocument()
  })

  it('shows a position diagnostic while retaining the vector output', () => {
    render(<App />)

    const position = screen.getByRole('textbox', { name: 'Position 1' })
    fireEvent.change(position, { target: { value: '12' } })

    expect(position).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('GEOM_INVALID_POSITION')
    expect(screen.getByText('2e1 + e2', { selector: 'output' })).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveTextContent(
      'Vector 1 runs from the origin to 2, 1.',
    )
  })

  it('offers editable positions for vectors and bivectors but not scalars or lists', () => {
    render(<App />)

    const expression = screen.getByRole('textbox', { name: 'Expression 1' })
    expect(
      screen.getByRole('textbox', { name: 'Position 1' }),
    ).toBeInTheDocument()

    fireEvent.change(expression, { target: { value: '12' } })

    expect(
      screen.queryByRole('textbox', { name: 'Position 1' }),
    ).not.toBeInTheDocument()

    fireEvent.change(expression, { target: { value: '3e12' } })

    expect(screen.getByText('Bivector')).toBeInTheDocument()
    expect(
      screen.getByText('3e12', { selector: 'output' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'Position 1' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveTextContent(
      'Bivector 1 is an oriented loop with signed value 3, area 3, counterclockwise orientation, positioned at the origin.',
    )

    fireEvent.change(expression, { target: { value: '[e1, e2]' } })

    expect(screen.getByText('List (2)')).toBeInTheDocument()
    expect(
      screen.queryByRole('textbox', { name: 'Position 1' }),
    ).not.toBeInTheDocument()
  })

  it.each([
    ['12', 'Scalar'],
    ['(2, 1)', 'Vector'],
    ['3e12', 'Bivector'],
    ['1 + e12', 'Rotor'],
    ['1 + e1 + e12', 'Mixed multivector'],
  ])('labels %s as %s without derived details', (source, kind) => {
    render(<App />)

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Expression 1' }),
      { target: { value: source } },
    )

    expect(screen.getByText(kind)).toBeInTheDocument()
    expect(screen.queryByText(/‖/)).not.toBeInTheDocument()
  })

  it('evaluates an outer product as a textual and visual bivector object', () => {
    render(<App />)

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Expression 1' }),
      { target: { value: '(1, 0) ^ (0, 1)' } },
    )

    expect(screen.getByText('Bivector')).toBeInTheDocument()
    expect(screen.getByText('e12', { selector: 'output' })).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveTextContent(
      'Bivector 1 is an oriented loop with signed value 1, area 1, counterclockwise orientation, positioned at the origin.',
    )
  })

  it('inserts after the active row with Enter and deletes an empty row', () => {
    render(<App />)

    const first = screen.getByRole('textbox', { name: 'Expression 1' })
    fireEvent.keyDown(first, { key: 'Enter' })

    const second = screen.getByRole('textbox', { name: 'Expression 2' })
    expect(second).toHaveFocus()
    fireEvent.keyDown(second, { key: 'Backspace' })

    expect(
      screen.queryByRole('textbox', { name: 'Expression 2' }),
    ).not.toBeInTheDocument()
    expect(first).toHaveFocus()
  })

  it('inserts below from a position field with Enter', () => {
    render(<App />)
    const position = screen.getByRole('textbox', { name: 'Position 1' })
    fireEvent.change(position, { target: { value: '(1, 1)' } })

    fireEvent.keyDown(position, { key: 'Enter' })

    expect(screen.getByRole('textbox', { name: 'Position 1' }))
      .toHaveValue('(1, 1)')
    expect(screen.getByRole('textbox', { name: 'Expression 2' })).toHaveFocus()
  })

  it('inserts above from expression and position fields with Shift+Enter', () => {
    render(<App />)
    const expression = screen.getByRole('textbox', { name: 'Expression 1' })

    fireEvent.keyDown(expression, { key: 'Enter', shiftKey: true })

    expect(screen.getByRole('textbox', { name: 'Expression 1' })).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'Expression 2' }))
      .toHaveValue('vector(2, 1)')

    const position = screen.getByRole('textbox', { name: 'Position 2' })
    fireEvent.keyDown(position, { key: 'Enter', shiftKey: true })

    expect(screen.getByRole('textbox', { name: 'Expression 2' })).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'Expression 3' }))
      .toHaveValue('vector(2, 1)')
  })

  it('keeps sibling results when one expression is invalid or deleted', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Add expression' }))
    const first = screen.getByRole('textbox', { name: 'Expression 1' })
    const second = screen.getByRole('textbox', { name: 'Expression 2' })
    fireEvent.change(first, { target: { value: 'vector(1)' } })
    fireEvent.change(second, { target: { value: 'e2' } })

    expect(first).toHaveAttribute('aria-invalid', 'true')
    expect(second).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByLabelText('Vector 2')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Delete expression 1' }),
    )

    expect(screen.getByRole('textbox', { name: 'Expression 1' })).toHaveValue(
      'e2',
    )
    expect(screen.getByLabelText('Vector 1')).toBeInTheDocument()
  })

  it('resizes the expression panel with an accessible separator', () => {
    render(<App />)

    const separator = screen.getByRole('separator', {
      name: 'Resize expression panel',
    })
    expect(separator).toHaveAttribute('aria-valuenow', '340')

    fireEvent.keyDown(separator, { key: 'ArrowRight' })

    expect(separator).toHaveAttribute('aria-valuenow', '356')
    expect(
      screen.getByRole('complementary', { name: 'Expressions' }),
    ).toHaveStyle({ width: '356px' })
  })

  it('squares the canvas by widening the expression panel past the drag cap', () => {
    render(<App />)
    const separator = screen.getByRole('separator', {
      name: 'Resize expression panel',
    })
    const workspace = screen.getByRole('main')
    vi.spyOn(workspace, 'getBoundingClientRect').mockReturnValue({
      width: 2000,
      height: 1200,
      top: 0,
      left: 0,
      right: 2000,
      bottom: 1200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    fireEvent.click(screen.getByRole('button', { name: 'Make canvas square' }))

    // 2000 workspace − 6 separator − 1200 tall canvas leaves a square canvas,
    // which needs more panel width than the former fixed 720 pixel cap allowed.
    expect(separator).toHaveAttribute('aria-valuenow', '794')
    expect(
      screen.getByRole('complementary', { name: 'Expressions' }),
    ).toHaveStyle({ width: '794px' })
  })

  it('opens the VGA algebra information and restores focus on Escape', () => {
    render(<App />)

    const trigger = screen.getByRole('button', { name: 'VGA · 2D' })
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog', {
      name: 'Vectorial Geometric Algebra ℝ(2,0,0)',
    })
    expect(dialog).toHaveTextContent('Basis & metric')
    expect(dialog).toHaveTextContent('Cayley table')
    expect(dialog).toHaveTextContent('Geometric interpretation')
    expect(dialog).toHaveTextContent('Sub-algebras')
    expect(dialog).not.toHaveTextContent('Available operations')
    expect(dialog).not.toHaveTextContent('A.involution')

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('names every default object color in text, not only as a swatch', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'VGA · 2D' }))
    const dialog = screen.getByRole('dialog', {
      name: 'Vectorial Geometric Algebra ℝ(2,0,0)',
    })

    expect(dialog).toHaveTextContent('Object colors')
    for (const [, style] of DEFAULT_OBJECT_STYLES) {
      const entry = paletteEntry(style)
      expect(entry).toBeDefined()
      expect(dialog).toHaveTextContent(entry?.name ?? style)
    }

    const listRow = screen.getByRole('rowheader', { name: 'List' }).closest('tr')
    expect(listRow).toHaveTextContent('green 3')
    expect(listRow?.querySelector('.object-color-swatch'))
      .toHaveAttribute('aria-hidden', 'true')
  })

  it('clears every expression after the clear control is held', () => {
    vi.useFakeTimers()
    try {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'Add expression' }))
      fireEvent.change(screen.getByRole('textbox', { name: 'Expression 2' }), {
        target: { value: 'e1 ^ e2' },
      })
      const clear = screen.getByRole('button', { name: 'Clear all expressions' })

      fireEvent.pointerDown(clear)
      act(() => void vi.advanceTimersByTime(CLEAR_HOLD_MS - 1))
      expect(screen.getByRole('textbox', { name: 'Expression 1' })).toBeInTheDocument()

      act(() => void vi.advanceTimersByTime(1))

      expect(screen.queryByRole('textbox', { name: 'Expression 1' }))
        .not.toBeInTheDocument()
      expect(clear).toBeDisabled()
      expect(screen.getByRole('img')).toHaveTextContent(
        'No spatial objects are visible from 0 expressions',
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps every expression when the hold is released early', () => {
    vi.useFakeTimers()
    try {
      render(<App />)
      const clear = screen.getByRole('button', { name: 'Clear all expressions' })

      fireEvent.pointerDown(clear)
      act(() => void vi.advanceTimersByTime(CLEAR_HOLD_MS / 2))
      fireEvent.pointerUp(clear)
      act(() => void vi.advanceTimersByTime(CLEAR_HOLD_MS))

      expect(screen.getByRole('textbox', { name: 'Expression 1' })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('offers the same hold gesture to the keyboard', () => {
    vi.useFakeTimers()
    try {
      render(<App />)
      const clear = screen.getByRole('button', { name: 'Clear all expressions' })

      fireEvent.keyDown(clear, { key: 'Enter' })
      act(() => void vi.advanceTimersByTime(CLEAR_HOLD_MS))

      expect(screen.queryByRole('textbox', { name: 'Expression 1' }))
        .not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('opens the expression reference from the bottom of the panel', () => {
    render(<App />)

    const trigger = screen.getByRole('button', {
      name: 'Expression reference',
    })
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog', {
      name: 'Expression Reference',
    })
    expect(dialog).toHaveTextContent('Operators')
    expect(dialog).toHaveTextContent('A & B')
    expect(dialog).toHaveTextContent('A.dual')
    expect(dialog).toHaveTextContent('V = (2, 1)')

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
