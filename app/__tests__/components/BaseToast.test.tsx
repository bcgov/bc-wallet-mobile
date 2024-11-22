import { render } from '@testing-library/react-native'
import React from 'react'

import BaseToast, { ToastType } from '../../src/components/toast/BaseToast'

describe('BaseToast Component', () => {
  test('Info renders correctly', () => {
    const tree = render(<BaseToast title={'Any Info Title'} body={'Any info body'} toastType={ToastType.Info} />)

    expect(tree).toMatchSnapshot()
  })

  test('Success renders correctly', () => {
    const tree = render(
      <BaseToast title={'Any Success Title'} body={'Any success message'} toastType={ToastType.Success} />
    )

    expect(tree).toMatchSnapshot()
  })

  test('Warn renders correctly', () => {
    const tree = render(
      <BaseToast title={'Any Warning Title'} body={'Any warning message'} toastType={ToastType.Warn} />
    )

    expect(tree).toMatchSnapshot()
  })

  test('Error renders correctly', () => {
    const tree = render(<BaseToast title={'Any Error Title'} body={'Any error message'} toastType={ToastType.Error} />)

    expect(tree).toMatchSnapshot()
  })

  test('Toast Renders without body text', () => {
    const tree = render(<BaseToast title={'Any Toast Title'} toastType={ToastType.Error} />)
    const bodyText = tree.queryByTestId('ToastBody')
    expect(bodyText).toBeNull()
  })
})
