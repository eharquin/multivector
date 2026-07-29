import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(cleanup)

describe('application shell', () => {
  it('introduces MultiVector and its algebra models', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Create, evaluate, and visualize multivector expressions',
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('heading', { name: 'Vector geometric algebra' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Projective geometric algebra' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Conformal geometric algebra' }),
    ).toBeInTheDocument()
  })
})
