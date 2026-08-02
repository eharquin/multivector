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

afterEach(cleanup)

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
    expect(vector).toHaveAttribute('x2', '500')
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

  it('controls axes, graduations, and object scale independently', () => {
    const { container } = render(<App />)
    expect(container.querySelectorAll('.axis')).toHaveLength(2)
    expect(container.querySelectorAll('.graduation').length).toBeGreaterThan(0)
    openDisplaySettings()

    fireEvent.click(screen.getByRole('switch', { name: 'Axes and labels' }))
    expect(container.querySelectorAll('.axis')).toHaveLength(0)
    expect(container.querySelectorAll('.graduation').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('switch', { name: 'Graduations' }))
    expect(container.querySelectorAll('.graduation')).toHaveLength(0)

    fireEvent.change(screen.getByRole('slider', { name: 'Object scale' }), {
      target: { value: '1.5' },
    })
    expect(screen.getByLabelText('Vector 1')).toHaveAttribute('stroke-width', '6')
    expect(screen.getByText('1.50×')).toBeInTheDocument()
  })

  it('configures a direct scalar slider that rewrites source and supports undo', () => {
    render(<App />)
    const source = screen.getByRole('textbox', { name: 'Expression 1' })
    fireEvent.change(source, { target: { value: 'a = ((2))' } })
    const trigger = screen.getByRole('button', {
      name: 'Configure scalar control for a',
    })

    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Control — a' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Number' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Slider' }))
      .toHaveAttribute('aria-pressed', 'true')
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
    expect(screen.queryByRole('slider', { name: 'Value for a' }))
      .not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Minimum source' }))
      .toHaveValue('-10')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Control — a' }))
      .not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('preserves unsupported or out-of-range scalar source without clamping', () => {
    render(<App />)
    const source = screen.getByRole('textbox', { name: 'Expression 1' })
    fireEvent.change(source, { target: { value: 'a = 20' } })
    fireEvent.click(screen.getByRole('button', {
      name: 'Configure scalar control for a',
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

  it('opens display settings, restores focus on close, and records no history', () => {
    render(<App />)
    const undo = screen.getByRole('button', { name: 'Undo document change' })
    expect(screen.queryByRole('switch', { name: 'Grid' })).not.toBeInTheDocument()

    const trigger = openDisplaySettings()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('switch', { name: 'Grid' })).toHaveFocus()

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

    fireEvent.click(screen.getByRole('button', { name: 'Edit appearance for Scalar' }))

    expect(screen.getByRole('dialog', { name: 'Appearance — Scalar' })).toBeInTheDocument()
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

    fireEvent.click(screen.getByRole('button', { name: 'Edit appearance for Vector' }))
    expect(screen.getByRole('dialog', { name: 'Appearance — Vector' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Use color green 4' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Text' }), {
      target: { value: 'Velocity' },
    })

    expect(screen.getByText('2e1 + e2', { selector: 'output' })).toBeInTheDocument()
    expect(screen.getByText('Velocity', { selector: 'text' })).toBeInTheDocument()
    expect(screen.getByText('Vector')).toHaveStyle({ color: '#0F9D57' })
  })

  it('restores the declared name when the label text is cleared', () => {
    render(<App />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Expression 1' }), {
      target: { value: 'V = vector(2, 1)' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Edit appearance for V' }))

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
    fireEvent.click(screen.getByRole('button', { name: 'Edit appearance for V' }))
    const label = screen.getByRole('textbox', { name: 'Text' })

    label.focus()
    fireEvent.change(label, { target: { value: 'V' } })
    expect(label).toHaveFocus()
    fireEvent.change(label, { target: { value: 'Ve' } })
    expect(label).toHaveFocus()
  })

  it('returns focus to the swatch when the appearance popover closes', () => {
    render(<App />)
    const swatch = screen.getByRole('button', { name: 'Edit appearance for Vector' })

    fireEvent.click(swatch)
    fireEvent.click(screen.getByRole('button', { name: 'Close appearance' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(swatch).toHaveFocus()
  })

  it('closes appearance with Escape and restores focus without a keyboard trap', () => {
    render(<App />)
    const swatch = screen.getByRole('button', {
      name: 'Edit appearance for Vector',
    })

    fireEvent.click(swatch)
    expect(screen.getByRole('dialog', { name: 'Appearance — Vector' }))
      .toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Visible' })).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(swatch).toHaveFocus()
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
