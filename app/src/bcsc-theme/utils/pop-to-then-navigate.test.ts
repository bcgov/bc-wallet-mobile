import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { NavigationAction, NavigationState } from '@react-navigation/native'
import { popToThenNavigate } from './pop-to-then-navigate'

type ResetPayload = { key: string; index: number; routes: { key?: string; name: string; params?: object }[] }

const stackOf = (names: BCSCScreens[]): NavigationState<BCSCVerifyStackParams> => ({
  type: 'stack',
  key: 'verify-stack',
  stale: false,
  index: names.length - 1,
  routeNames: Object.values(BCSCScreens) as (keyof BCSCVerifyStackParams)[],
  routes: names.map((name) => ({ key: `${name}-key`, name: name as keyof BCSCVerifyStackParams })),
})

// Runs the helper against a stack and returns the reset it dispatches, as React Navigation would see it.
const dispatchAgainst = (names: BCSCScreens[], run: (navigation: { dispatch: jest.Mock }) => void) => {
  const navigation = { dispatch: jest.fn() }
  run(navigation)

  expect(navigation.dispatch).toHaveBeenCalledTimes(1)
  const buildAction = navigation.dispatch.mock.calls[0][0] as (state: NavigationState) => NavigationAction
  return (buildAction(stackOf(names)) as unknown as { payload: ResetPayload }).payload
}

const names = (payload: ResetPayload) => payload.routes.map((route) => route.name)

describe('popToThenNavigate', () => {
  const toDualId = (navigation: { dispatch: jest.Mock }) =>
    popToThenNavigate<BCSCVerifyStackParams, BCSCScreens.DualIdentificationRequired>(
      navigation,
      BCSCScreens.IdentitySelection,
      BCSCScreens.DualIdentificationRequired
    )

  it('drops every route above the anchor and opens the screen on top', () => {
    const payload = dispatchAgainst(
      [BCSCScreens.VerifyPrompt, BCSCScreens.IdentitySelection, BCSCScreens.ScanSerial, BCSCScreens.CardScanningError],
      toDualId
    )

    expect(names(payload)).toEqual([
      BCSCScreens.VerifyPrompt,
      BCSCScreens.IdentitySelection,
      BCSCScreens.DualIdentificationRequired,
    ])
    expect(payload.index).toBe(2)
  })

  it('drops whatever sits above the anchor, repeats included', () => {
    const payload = dispatchAgainst(
      [
        BCSCScreens.IdentitySelection,
        BCSCScreens.ScanSerial,
        BCSCScreens.ManualSerial,
        BCSCScreens.ScanSerial,
        BCSCScreens.CardScanningError,
      ],
      toDualId
    )

    expect(names(payload)).toEqual([BCSCScreens.IdentitySelection, BCSCScreens.DualIdentificationRequired])
  })

  it('keeps the retained routes and the navigator key, so nothing is remounted', () => {
    const payload = dispatchAgainst(
      [BCSCScreens.VerifyPrompt, BCSCScreens.IdentitySelection, BCSCScreens.CardScanningError],
      toDualId
    )

    expect(payload.routes.slice(0, 2).map((route) => route.key)).toEqual([
      `${BCSCScreens.VerifyPrompt}-key`,
      `${BCSCScreens.IdentitySelection}-key`,
    ])
    expect(payload.key).toBe('verify-stack')
  })

  it('leaves the stack as is and opens the screen on top when the anchor is missing', () => {
    const payload = dispatchAgainst([BCSCScreens.ScanSerial, BCSCScreens.CardScanningError], toDualId)

    expect(names(payload)).toEqual([
      BCSCScreens.ScanSerial,
      BCSCScreens.CardScanningError,
      BCSCScreens.DualIdentificationRequired,
    ])
    expect(payload.routes.slice(0, 2).map((route) => route.key)).toEqual([
      `${BCSCScreens.ScanSerial}-key`,
      `${BCSCScreens.CardScanningError}-key`,
    ])
    expect(payload.index).toBe(2)
  })

  it('passes params to the opened screen', () => {
    const payload = dispatchAgainst([BCSCScreens.IdentitySelection, BCSCScreens.CardScanningError], (navigation) =>
      popToThenNavigate<BCSCVerifyStackParams, BCSCScreens.VerifyWebView>(
        navigation,
        BCSCScreens.IdentitySelection,
        BCSCScreens.VerifyWebView,
        { title: 'Help', url: 'https://example.com' }
      )
    )

    expect(payload.routes.at(-1)).toEqual({
      name: BCSCScreens.VerifyWebView,
      params: { title: 'Help', url: 'https://example.com' },
    })
  })
})
