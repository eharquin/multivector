import { describe, expect, it } from 'vitest'
import {
  scalarPlaybackFrame,
  scalarPlaybackOffset,
  snapToControlBounds,
  type PlaybackParameters,
} from './scalarPlayback'

const parameters = (
  mode: 'once' | 'loop' | 'ping-pong',
  direction: 'forward' | 'reverse' = 'forward',
): PlaybackParameters => ({
  minimum: 0, maximum: 10, step: 1,
  animation: { mode, direction, durationSeconds: 2 },
})

describe('deterministic scalar playback', () => {
  it('maps elapsed time to stepped once playback and completes at the endpoint', () => {
    expect(scalarPlaybackFrame(parameters('once'), 1000)).toEqual({ value: 5, completed: false })
    expect(scalarPlaybackFrame(parameters('once'), 2500)).toEqual({ value: 10, completed: true })
  })

  it('loops and ping-pongs independently of frame cadence', () => {
    expect(scalarPlaybackFrame(parameters('loop'), 2500).value).toBe(3)
    expect(scalarPlaybackFrame(parameters('ping-pong'), 2500).value).toBe(8)
    expect(scalarPlaybackFrame(parameters('ping-pong'), 3500).value).toBe(3)
  })

  it('supports reverse direction and continuation from a current value', () => {
    expect(scalarPlaybackFrame(parameters('once', 'reverse'), 500).value).toBe(8)
    expect(scalarPlaybackOffset(parameters('once'), 4)).toBe(800)
    expect(scalarPlaybackOffset(parameters('once', 'reverse'), 4)).toBe(1200)
  })

  it('reaches full-precision endpoints even when the step does not divide the interval', () => {
    const maximum = Math.PI * 2
    const tauParameters: PlaybackParameters = {
      minimum: 0,
      maximum,
      step: 0.01,
      animation: { mode: 'once', direction: 'forward', durationSeconds: 2 },
    }
    expect(scalarPlaybackFrame(tauParameters, 2000).value).toBe(maximum)
    expect(scalarPlaybackFrame({
      ...tauParameters,
      animation: { ...tauParameters.animation, direction: 'reverse' },
    }, 2000).value).toBe(0)
  })

  it('rounds away binary64 step-multiplication artifacts, e.g. 357 * 0.01', () => {
    // Reported case: playing a "0, tau, 0.01" slider showed a = 3.5700000000000003.
    const tauParameters: PlaybackParameters = {
      minimum: 0,
      maximum: Math.PI * 2,
      step: 0.01,
      animation: { mode: 'once', direction: 'forward', durationSeconds: 2 },
    }
    expect(scalarPlaybackFrame(tauParameters, 1136.37).value).toBe(3.57)
  })

  it('never produces a value with more decimal digits than its step implies', () => {
    const tauParameters: PlaybackParameters = {
      minimum: 0,
      maximum: Math.PI * 2,
      step: 0.01,
      animation: { mode: 'once', direction: 'forward', durationSeconds: 2 },
    }
    for (let elapsed = 0; elapsed <= 2000; elapsed += 17) {
      const { value } = scalarPlaybackFrame(tauParameters, elapsed)
      const decimals = (value.toString().split('.')[1] ?? '').length
      expect(decimals).toBeLessThanOrEqual(2)
    }
  })
})

describe('slider bound snapping', () => {
  it('snaps the last reachable step below an unreachable maximum to that maximum', () => {
    // A "0, tau, 0.00001" slider can only reach 6.28318 by native stepping;
    // this is the reported scenario this function exists to fix.
    const maximum = Math.PI * 2
    expect(snapToControlBounds(6.28318, 0, maximum, 0.00001)).toBe(maximum)
  })

  it('snaps the first reachable step above an unreachable minimum to that minimum', () => {
    expect(snapToControlBounds(0.00001, 0.000005307179586, 10, 0.00001))
      .toBe(0.000005307179586)
  })

  it('leaves a value untouched when it is more than a step away from either bound', () => {
    expect(snapToControlBounds(5, 0, 10, 1)).toBe(5)
  })

  it('leaves an exact bound untouched', () => {
    expect(snapToControlBounds(0, 0, 10, 1)).toBe(0)
    expect(snapToControlBounds(10, 0, 10, 1)).toBe(10)
  })

  it('does not snap a value already past the maximum toward the minimum branch', () => {
    // Ensures both branches independently guard with a directional comparison.
    expect(snapToControlBounds(9.9999, 0, 10, 0.01)).toBe(10)
  })
})
