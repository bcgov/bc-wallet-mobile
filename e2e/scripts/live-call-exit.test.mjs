import assert from 'node:assert/strict'
import { test } from 'node:test'
import { leaveLiveCall } from '../src/flows/verify.ts'
import {
  LiveCallLoadingScreen,
  LiveCallScreen,
  StartCallScreen,
  VerificationSuccessScreen,
  VerifyNotCompleteScreen,
} from '../src/screens/verify.ts'

function simulateCall(
  t,
  {
    initialState = 'waiting',
    cancelVisibleAt = 10_000,
    answerAt = Infinity,
    cancelDestination = 'start',
    answerDuringCancelTap = false,
    tapError,
  } = {}
) {
  let now = 0
  let state = initialState
  let arrival
  const taps = []
  t.mock.method(Date, 'now', () => now)

  const advance = (milliseconds) => {
    now += milliseconds
    if (arrival && now >= arrival.at) {
      state = arrival.destination
      arrival = undefined
    } else if (state === 'waiting' && now >= answerAt) {
      state = 'connected'
    }
  }
  const probe = (screen, expectedState) => {
    t.mock.method(screen, 'isPresent', async (timeout) => {
      if (state !== expectedState) advance(timeout)
      return state === expectedState
    })
  }
  probe(LiveCallLoadingScreen, 'waiting')
  probe(LiveCallScreen, 'connected')
  probe(VerifyNotCompleteScreen, 'incomplete')
  probe(VerificationSuccessScreen, 'verified')
  // Android may report StartCall's underlying controls as visible while LiveCall still covers them.
  t.mock.method(StartCallScreen, 'isPresent', async () => ['start', 'waiting', 'connected'].includes(state))
  t.mock.method(LiveCallLoadingScreen, 'isVisible', async (name) => {
    assert.equal(name, 'cancel')
    return state === 'waiting' && now >= cancelVisibleAt
  })
  t.mock.method(LiveCallLoadingScreen, 'tapWhenEnabled', async (role) => {
    assert.equal(role, 'primary')
    assert.ok(now >= cancelVisibleAt, 'Cancel must not be tapped before it appears')
    if (tapError) throw tapError
    if (answerDuringCancelTap) {
      state = 'connected'
      throw new Error('Cancel left the screen as the agent answered')
    }
    taps.push({ action: 'cancel', at: now })
    arrival = { at: now + 3_000, destination: cancelDestination }
  })
  t.mock.method(LiveCallScreen, 'tapWhenEnabled', async (role) => {
    assert.equal(role, 'primary')
    taps.push({ action: 'end', at: now })
    arrival = { at: now + 3_000, destination: 'incomplete' }
  })
  return { taps, state: () => state }
}

test('waits for delayed Cancel, taps once through cleanup, and reaches StartCall', async (t) => {
  const call = simulateCall(t)
  assert.equal(await leaveLiveCall(), 'cancelled')
  assert.equal(call.state(), 'start')
  assert.equal(call.taps.length, 1)
  assert.equal(call.taps[0].action, 'cancel')
  assert.ok(call.taps[0].at >= 10_000)
})

test('ends a connected call and waits for VerifyNotComplete', async (t) => {
  const call = simulateCall(t, { initialState: 'connected' })
  assert.equal(await leaveLiveCall(), 'ended')
  assert.equal(call.state(), 'incomplete')
  assert.deepEqual(
    call.taps.map(({ action }) => action),
    ['end']
  )
})

test('ends the call if the agent answers before Cancel appears', async (t) => {
  const call = simulateCall(t, { answerAt: 5_000 })
  assert.equal(await leaveLiveCall(), 'ended')
  assert.deepEqual(
    call.taps.map(({ action }) => action),
    ['end']
  )
})

test('rechecks the call when the agent answers between finding Cancel and tapping it', async (t) => {
  const call = simulateCall(t, { cancelVisibleAt: 0, answerDuringCancelTap: true })
  assert.equal(await leaveLiveCall(), 'ended')
  assert.deepEqual(
    call.taps.map(({ action }) => action),
    ['end']
  )
})

test('accepts an already-ended call without tapping', async (t) => {
  const call = simulateCall(t, { initialState: 'incomplete' })
  assert.equal(await leaveLiveCall(), 'ended')
  assert.equal(call.taps.length, 0)
})

test('still fails if the agent unexpectedly verifies the account', async (t) => {
  simulateCall(t, { initialState: 'verified' })
  await assert.rejects(leaveLiveCall(), /ended VERIFIED/)
})

test('does not accept the old VerifyNotComplete destination after Cancel', async (t) => {
  simulateCall(t, { cancelVisibleAt: 0, cancelDestination: 'incomplete' })
  await assert.rejects(leaveLiveCall(), /instead of StartCall/)
})

test('does not swallow a tap failure when the waiting screen is still present', async (t) => {
  const error = new Error('Device tap failed')
  simulateCall(t, { cancelVisibleAt: 0, tapError: error })
  await assert.rejects(leaveLiveCall(), (actual) => actual === error)
})
