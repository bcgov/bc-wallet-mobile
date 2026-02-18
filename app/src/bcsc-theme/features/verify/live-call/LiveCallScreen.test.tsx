import { FcmService, FcmServiceProvider } from '@/bcsc-theme/features/fcm'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import LiveCallScreen from './LiveCallScreen'

describe('LiveCall', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const fcmService = new FcmService()
    const tree = render(
      <BasicAppContext>
        <FcmServiceProvider service={fcmService}>
          <LiveCallScreen navigation={mockNavigation as never} />
        </FcmServiceProvider>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()

    tree.unmount()
  })

  it('suppresses FCM on mount and re-enables on unmount', () => {
    const fcmService = new FcmService()
    const spy = jest.spyOn(fcmService, 'setSuppressed')

    const tree = render(
      <BasicAppContext>
        <FcmServiceProvider service={fcmService}>
          <LiveCallScreen navigation={mockNavigation as never} />
        </FcmServiceProvider>
      </BasicAppContext>
    )

    expect(spy).toHaveBeenCalledWith(true)
    spy.mockClear()

    tree.unmount()
    expect(spy).toHaveBeenCalledWith(false)
  })
})
