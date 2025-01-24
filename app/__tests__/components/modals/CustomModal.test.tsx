import { testIdWithKey } from '@hyperledger/aries-bifold-core'
import { render, fireEvent } from '@testing-library/react-native'
import React from 'react'
import { CustomModal } from '../../../src/components/modals/CustomModal'

const title = 'Test Title'
const description = 'Lorem ipsum sit dolar amet'

describe('DismissibleCustomModal Component', () => {
  test('Renders correctly without call to action', () => {
    const onDismissPressed = jest.fn()
    const tree = render(<CustomModal title={title} description={description} onDismissPressed={onDismissPressed} />)

    expect(tree).toMatchSnapshot()
  })

  test('Renders correctly with primary call to action', () => {
    const onDismissPressed = jest.fn()
    const onCallToActionPressed = jest.fn()
    const tree = render(
      <CustomModal
        title={title}
        description={description}
        onDismissPressed={onDismissPressed}
        primary={{ label: 'Okay', action: onCallToActionPressed }}
      />
    )

    expect(tree).toMatchSnapshot()
  })

  test('Triggers call to action on primary press', () => {
    const onDismissPressed = jest.fn()
    const onCallToActionPressed = jest.fn()
    const { getByText } = render(
      <CustomModal
        title={title}
        description={description}
        onDismissPressed={onDismissPressed}
        primary={{ label: 'Okay', action: onCallToActionPressed }}
      />
    )
    const okayButton = getByText('Okay')
    fireEvent(okayButton, 'press')

    expect(onCallToActionPressed).toBeCalledTimes(1)
  })

  test('Triggers call to action on secondary press', () => {
    const onDismissPressed = jest.fn()
    const onCallToActionPressed = jest.fn()
    const { getByText } = render(
      <CustomModal
        title={title}
        description={description}
        onDismissPressed={onDismissPressed}
        primary={{ label: 'Okay', action: () => {} }}
        secondary={{ label: 'Cancel', action: onCallToActionPressed }}
      />
    )
    const okayButton = getByText('Cancel')
    fireEvent(okayButton, 'press')

    expect(onCallToActionPressed).toBeCalledTimes(1)
  })

  test('Triggers dismiss on press', () => {
    const onDismissPressed = jest.fn()
    const onCallToActionPressed = jest.fn()
    const { getByTestId } = render(
      <CustomModal
        title={title}
        description={description}
        onDismissPressed={onDismissPressed}
        primary={{ label: 'Okay', action: onCallToActionPressed }}
      />
    )
    const closeButton = getByTestId(testIdWithKey('Close'))
    fireEvent(closeButton, 'press')

    expect(onDismissPressed).toBeCalledTimes(1)
  })
})
