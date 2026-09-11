import HomeHeaderView from '@bcwallet-theme/components/HomeHeaderView'
import { Screens, Stacks, testIdWithKey } from '@bifold/core'
import { useAgent } from '@bifold/react-hooks'
import { BasicAppContext } from '@mocks/helpers/app'
import { useNavigation } from '@react-navigation/native'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'

jest.mock('@bifold/react-hooks', () => ({
  ...jest.requireActual('@bifold/react-hooks'),
  useAgent: jest.fn(),
}))

const mockedUseAgent = useAgent as jest.MockedFunction<typeof useAgent>

const agentWithLogger = (remoteLoggingEnabled: boolean) =>
  ({ agent: { config: { logger: { remoteLoggingEnabled, sessionId: 654321 } } } }) as never

describe('HomeHeaderView Component', () => {
  it('renders the session id banner while remote logging is enabled', () => {
    mockedUseAgent.mockReturnValue(agentWithLogger(true))

    const tree = render(
      <BasicAppContext>
        <HomeHeaderView />
      </BasicAppContext>
    )

    expect(tree.getByTestId(testIdWithKey('SessionIdBanner'))).toBeTruthy()
    expect(tree.getByText('RemoteLogging.Banner')).toBeTruthy()
  })

  it('navigates to the Developer screen when the banner is pressed', () => {
    mockedUseAgent.mockReturnValue(agentWithLogger(true))

    const tree = render(
      <BasicAppContext>
        <HomeHeaderView />
      </BasicAppContext>
    )

    fireEvent.press(tree.getByTestId(testIdWithKey('SessionIdBanner')))

    expect(useNavigation().getParent()?.navigate).toHaveBeenCalledWith(Stacks.SettingStack, {
      screen: Screens.Developer,
    })
  })

  it('renders nothing while remote logging is disabled', () => {
    mockedUseAgent.mockReturnValue(agentWithLogger(false))

    const tree = render(
      <BasicAppContext>
        <HomeHeaderView />
      </BasicAppContext>
    )

    expect(tree.queryByTestId(testIdWithKey('SessionIdBanner'))).toBeNull()
  })

  it('renders nothing when there is no agent', () => {
    mockedUseAgent.mockReturnValue({ agent: undefined } as never)

    const tree = render(
      <BasicAppContext>
        <HomeHeaderView />
      </BasicAppContext>
    )

    expect(tree.queryByTestId(testIdWithKey('SessionIdBanner'))).toBeNull()
  })
})
