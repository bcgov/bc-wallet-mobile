import en from '@/localization/en'
import fr from '@/localization/fr'
import ptBr from '@/localization/pt-br'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import React, { createRef } from 'react'
import { Modal, TouchableWithoutFeedback } from 'react-native'
import FloatingHelpMenu, { FloatingHelpMenuRef } from './FloatingHelpMenu'

// The global react-i18next mock returns raw keys, so interpolate locally to assert version/build.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      if (key !== 'BCSC.HelpMenu.Version') {
        return key
      }
      return 'App version: {{ version }} ({{ build }})'
        .replace('{{ version }}', options?.version ?? '')
        .replace('{{ build }}', options?.build ?? '')
    },
  }),
}))

const renderOpenMenu = () => {
  const onClose = jest.fn()
  const ref = createRef<FloatingHelpMenuRef>()
  render(
    <BasicAppContext>
      <FloatingHelpMenu open onClose={onClose} ref={ref} />
    </BasicAppContext>
  )
  return { onClose, ref }
}

// The slide-out is 150ms of animation frames on the JS driver; a second of fake time settles it.
const settleAnimation = () => act(() => jest.advanceTimersByTime(1000))

describe('FloatingHelpMenu', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders the app version with the build number', () => {
    render(
      <BasicAppContext>
        <FloatingHelpMenu open onClose={jest.fn()} />
      </BasicAppContext>
    )

    // '4.0.0' and '142' come from the react-native-device-info jest mock.
    expect(screen.getByText('App version: 4.0.0 (142)')).toBeTruthy()
  })

  // The mock above hardcodes its template, so it can't catch a regression in the shipped
  // locale copy; assert against the real locale resources so a dropped `{{ build }}` fails.
  it('keeps the build placeholder in the shipped locale strings', () => {
    expect(en.BCSC.HelpMenu.Version).toContain('{{ version }}')
    expect(en.BCSC.HelpMenu.Version).toContain('{{ build }}')
    expect(fr.BCSC.HelpMenu.Version).toContain('{{ build }}')
    expect(ptBr.BCSC.HelpMenu.Version).toContain('{{ build }}')
  })

  it('closes when the backdrop is pressed', () => {
    const { onClose } = renderOpenMenu()

    const [backdrop] = screen.UNSAFE_getAllByType(TouchableWithoutFeedback)
    fireEvent.press(backdrop)
    settleAnimation()

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('stays open when the menu itself is tapped', () => {
    const { onClose } = renderOpenMenu()

    fireEvent.press(screen.getByText('BCSC.HelpMenu.Title'))
    settleAnimation()

    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes from the close button', () => {
    const { onClose } = renderOpenMenu()

    fireEvent.press(screen.getByRole('button', { name: 'Global.Close' }))
    settleAnimation()

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on the system back request', () => {
    const { onClose } = renderOpenMenu()

    fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose')
    settleAnimation()

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes cleanly while the opening slide is still running', () => {
    const { onClose } = renderOpenMenu()

    fireEvent(screen.UNSAFE_getByType(Modal), 'show')
    fireEvent.press(screen.getByRole('button', { name: 'Global.Close' }))
    settleAnimation()

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('runs the onClosed callback after onClose when closed through the ref', () => {
    const { onClose, ref } = renderOpenMenu()
    const onClosed = jest.fn()

    act(() => ref.current?.close(onClosed))
    settleAnimation()

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onClosed).toHaveBeenCalledTimes(1)
    expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(onClosed.mock.invocationCallOrder[0])
  })
})
