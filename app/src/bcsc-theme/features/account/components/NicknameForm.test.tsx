import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { ScrollView, TextInput } from 'react-native'
import NicknameForm from './NicknameForm'

describe('NicknameForm', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('jumps to and focuses the nickname field when the nickname is empty', async () => {
    const scrollToSpy = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(jest.fn())
    const focusSpy = jest.spyOn(TextInput.prototype, 'focus')
    const onSubmit = jest.fn()
    const tree = render(
      <BasicAppContext>
        <NicknameForm onSubmit={onSubmit} />
      </BasicAppContext>
    )

    fireEvent(tree.getByTestId('com.ariesbifold:id/accountNickname-input'), 'layout', {
      nativeEvent: { layout: { y: 50 } },
    })
    await act(async () => {
      fireEvent.press(tree.getByTestId(testIdWithKey('SaveAndContinue')))
    })

    expect(onSubmit).not.toHaveBeenCalled()
    expect(scrollToSpy).toHaveBeenCalledWith({ y: 50, animated: false })
    expect(focusSpy.mock.instances.map((i: any) => i.props.testID)).toEqual([
      'com.ariesbifold:id/accountNickname-input',
    ])
  })
})
