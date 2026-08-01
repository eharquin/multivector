import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(cleanup)

describe('VGA 2D vertical slice', () => {
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

  it('opens the VGA algebra information and restores focus on Escape', () => {
    render(<App />)

    const trigger = screen.getByRole('button', { name: 'VGA · 2D' })
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog', {
      name: 'Vectorial Geometric Algebra ℝ(2,0,0)',
    })
    expect(dialog).toHaveTextContent('Basis & metric')
    expect(dialog).toHaveTextContent('Cayley table')
    expect(dialog).toHaveTextContent('A.involution')
    expect(dialog).not.toHaveTextContent('Object kinds (color palette)')

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
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
