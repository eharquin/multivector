import type { ExpressionControl } from '../document/expressionDocument'

export type PlaybackParameters = Readonly<{
  minimum: number
  maximum: number
  step: number
  animation: NonNullable<ExpressionControl['animation']>
}>

export type PlaybackFrame = Readonly<{
  value: number
  completed: boolean
}>

function steppedValue(
  minimum: number,
  maximum: number,
  step: number,
  progress: number,
): number {
  if (progress <= 0) return minimum
  if (progress >= 1) return maximum
  const raw = minimum + (maximum - minimum) * progress
  const stepped = minimum + Math.round((raw - minimum) / step) * step
  return Math.min(maximum, Math.max(minimum, stepped))
}

/**
 * Snaps a directly-reported control value (slider drag, keyboard step) to its
 * declared bound when native step quantization can never land exactly on
 * that bound — for example an irrational maximum like `tau` with a rational
 * step. Without this, dragging a slider to its visual end can stop one step
 * short of the true bound.
 */
export function snapToControlBounds(
  value: number,
  minimum: number,
  maximum: number,
  step: number,
): number {
  if (value <= maximum && maximum - value < step) return maximum
  if (value >= minimum && value - minimum < step) return minimum
  return value
}

/** Deterministic elapsed-time mapping; frame cadence never enters the result. */
export function scalarPlaybackFrame(
  parameters: PlaybackParameters,
  elapsedMilliseconds: number,
): PlaybackFrame {
  const { minimum, maximum, step, animation } = parameters
  const duration = animation.durationSeconds * 1000
  const elapsed = Math.max(0, elapsedMilliseconds)
  let progress: number
  let completed = false

  if (animation.mode === 'once') {
    progress = Math.min(1, elapsed / duration)
    completed = elapsed >= duration
  } else if (animation.mode === 'loop') {
    progress = (elapsed % duration) / duration
  } else {
    const phase = (elapsed % (duration * 2)) / duration
    progress = phase <= 1 ? phase : 2 - phase
  }
  if (animation.direction === 'reverse') progress = 1 - progress
  return { value: steppedValue(minimum, maximum, step, progress), completed }
}

/** Finds the deterministic timeline offset corresponding to the current value. */
export function scalarPlaybackOffset(
  parameters: PlaybackParameters,
  currentValue: number,
): number {
  const span = parameters.maximum - parameters.minimum
  const bounded = Math.min(parameters.maximum, Math.max(parameters.minimum, currentValue))
  let progress = span === 0 ? 0 : (bounded - parameters.minimum) / span
  if (parameters.animation.direction === 'reverse') progress = 1 - progress
  return progress * parameters.animation.durationSeconds * 1000
}
