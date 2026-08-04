import { describe, expect, it } from 'vitest'
import { scalarPlaybackFrame, scalarPlaybackOffset, type PlaybackParameters } from './scalarPlayback'

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
})
