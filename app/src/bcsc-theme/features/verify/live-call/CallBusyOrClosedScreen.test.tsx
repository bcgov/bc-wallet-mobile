import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import CallBusyOrClosedScreen from './CallBusyOrClosedScreen'

describe('CallBusyOrClosed', () => {
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
    const tree = render(
      <BasicAppContext>
        <CallBusyOrClosedScreen
          navigation={mockNavigation as never}
          route={
            {
              params: {
                busy: false,
                formattedHours: [
                  {
                    title: 'Monday to Friday',
                    hours: '8:00 AM - 5:00 PM Pacific Time',
                  },
                ],
              },
            } as never
          }
        />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
