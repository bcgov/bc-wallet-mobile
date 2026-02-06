import { ErrorAlertProvider } from '@/contexts/ErrorAlertContext'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { AuthSettingsScreen } from './AuthSettingsScreen'

describe('AuthSettings', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <ErrorAlertProvider>
          <AuthSettingsScreen navigation={mockNavigation as never} />
        </ErrorAlertProvider>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
