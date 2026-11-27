import { TestIds } from '@/test-ids/registry'
import { render } from '@testing-library/react-native'
import React from 'react'
import { BackHandler } from 'react-native'

import ProofRequestStackScreen from './ProofRequestStackScreen'

jest.mock('@bifold/core', () => ({
  ProofRequestStack: () => {
    const { Text } = jest.requireActual('react-native')
    return <Text>ProofRequestStack</Text>
  },
  Stacks: { ProofRequestsStack: 'Proof Requests Stack' },
  testIdWithKey: (key: string) => `com.ariesbifold:id/${key}`,
}))
jest.mock('@/bcsc-theme/features/agent', () => ({
  AgentReadyGate: ({ children, testID }: { children: React.ReactNode; testID?: string }) => {
    const { View } = jest.requireActual('react-native')
    return <View testID={testID}>{children}</View>
  },
}))
// Stands in for focus: the effect runs on mount and its cleanup on unmount.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react')
  return { useFocusEffect: (effect: () => (() => void) | void) => useEffect(effect, [effect]) }
})

const mkProps = () => {
  const navigation = { goBack: jest.fn() } as any
  const route = { key: 'proof-requests', name: 'Proof Requests Stack', params: undefined } as any
  return { navigation, route }
}

describe('ProofRequestStackScreen', () => {
  beforeEach(() => jest.clearAllMocks())

  it("renders Bifold's proof-request stack behind the agent-ready gate", () => {
    const { navigation, route } = mkProps()
    const { getByTestId, getByText } = render(<ProofRequestStackScreen navigation={navigation} route={route} />)

    expect(getByTestId(`com.ariesbifold:id/${TestIds.proof.changeCredential.loading}`)).toBeTruthy()
    expect(getByText('ProofRequestStack')).toBeTruthy()
  })

  it('closes the picker on hardware back, ahead of the Connection screen underneath that blocks it', () => {
    const spy = jest.spyOn(BackHandler, 'addEventListener')
    const { navigation, route } = mkProps()
    render(<ProofRequestStackScreen navigation={navigation} route={route} />)

    expect(spy).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function))
    const handler = spy.mock.calls.at(-1)![1] as () => boolean
    expect(handler()).toBe(true)
    expect(navigation.goBack).toHaveBeenCalledTimes(1)
  })

  it('stops handling hardware back once it loses focus', () => {
    const remove = jest.fn()
    jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({ remove } as any)
    const { navigation, route } = mkProps()
    const { unmount } = render(<ProofRequestStackScreen navigation={navigation} route={route} />)

    unmount()

    expect(remove).toHaveBeenCalledTimes(1)
  })
})
