import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, screen } from '@testing-library/react-native'
import React from 'react'
import { ConfigureMediatorScreen } from './ConfigureMediatorScreen'
import { useConfigureMediatorViewModel } from './useConfigureMediatorViewModel'

jest.mock('./useConfigureMediatorViewModel', () => ({ useConfigureMediatorViewModel: jest.fn() }))

const current = 'https://mediator.example/invite?oob=current'
const other = 'https://mediator-dev.example/invite?oob=other'

const makeViewModel = (overrides: Record<string, unknown> = {}) => ({
  mediators: [
    {
      url: current,
      label: 'BC Mediator (Test)',
      host: 'https://mediator.example/invite',
      selected: true,
      removable: false,
      removeLabel: 'Remove BC Mediator (Test)',
    },
    {
      url: other,
      label: 'https://mediator-dev.example/invite',
      host: 'https://mediator-dev.example/invite',
      selected: false,
      removable: true,
      removeLabel: 'Remove https://mediator-dev.example/invite',
    },
  ],
  switchingTo: null,
  descriptionText: 'description',
  scanButtonText: 'scan',
  selectMediator: jest.fn(),
  removeMediator: jest.fn(),
  scanMediator: jest.fn(),
  ...overrides,
})

const row = (label: string) =>
  screen.getByTestId(testIdWithKey(`${TestIds.main.configureMediator.mediatorRowPrefix}${label}`))
const removeControlId = (label: string) => testIdWithKey(`${TestIds.main.configureMediator.removeRowPrefix}${label}`)
const removeControl = (label: string) => screen.getByTestId(removeControlId(label))

const renderScreen = (scannedMediatorUri?: string) =>
  render(
    <BasicAppContext>
      <ConfigureMediatorScreen route={{ params: { scannedMediatorUri } } as never} navigation={{} as never} />
    </BasicAppContext>
  )

describe('ConfigureMediatorScreen', () => {
  let viewModel: ReturnType<typeof makeViewModel>

  beforeEach(() => {
    jest.clearAllMocks()
    viewModel = makeViewModel()
    jest.mocked(useConfigureMediatorViewModel).mockImplementation(() => viewModel as never)
  })

  it('hands the scanned invitation to the view model', () => {
    renderScreen('https://mediator-new.example/invite?oob=scanned')

    expect(useConfigureMediatorViewModel).toHaveBeenCalledWith('https://mediator-new.example/invite?oob=scanned')
  })

  it('renders every mediator and marks the selected one', () => {
    renderScreen()

    expect(screen.getByText('description')).toBeTruthy()
    expect(row('BC Mediator (Test)').props.accessibilityState).toMatchObject({ selected: true })
    expect(row('https://mediator-dev.example/invite').props.accessibilityState).toMatchObject({ selected: false })
  })

  it('shows the host under a mediator named by its invitation, and once for one that is not', () => {
    renderScreen()

    expect(screen.getByText('BC Mediator (Test)')).toBeTruthy()
    expect(screen.getByText('https://mediator.example/invite')).toBeTruthy()
    expect(screen.getAllByText('https://mediator-dev.example/invite')).toHaveLength(1)
  })

  it('selects a mediator when its row is pressed', () => {
    renderScreen()

    fireEvent.press(row('https://mediator-dev.example/invite'))

    expect(viewModel.selectMediator).toHaveBeenCalledWith(other)
  })

  it('offers a remove control only on removable rows', () => {
    renderScreen()

    expect(screen.queryByTestId(removeControlId('BC Mediator (Test)'))).toBeNull()
    expect(removeControl('https://mediator-dev.example/invite')).toHaveProp(
      'accessibilityLabel',
      'Remove https://mediator-dev.example/invite'
    )
  })

  it('exposes removal as an accessibility action on the row, which screen readers treat as one element', () => {
    renderScreen()

    expect(row('BC Mediator (Test)').props.accessibilityActions).toBeUndefined()
    expect(row('https://mediator-dev.example/invite').props.accessibilityActions).toEqual([
      { name: 'remove', label: 'Remove https://mediator-dev.example/invite' },
    ])

    fireEvent(row('https://mediator-dev.example/invite'), 'accessibilityAction', {
      nativeEvent: { actionName: 'remove' },
    })

    expect(viewModel.removeMediator).toHaveBeenCalledWith(other)
    expect(viewModel.selectMediator).not.toHaveBeenCalled()
  })

  it('removes a mediator from its remove control without selecting it', () => {
    renderScreen()

    fireEvent.press(removeControl('https://mediator-dev.example/invite'))

    expect(viewModel.removeMediator).toHaveBeenCalledWith(other)
    expect(viewModel.selectMediator).not.toHaveBeenCalled()
  })

  it('opens the scanner from the scan button', () => {
    renderScreen()

    fireEvent.press(screen.getByTestId(testIdWithKey(TestIds.main.configureMediator.scan)))

    expect(viewModel.scanMediator).toHaveBeenCalled()
  })

  it('disables the rows, the remove controls and the scan button while a switch is in progress', () => {
    viewModel = makeViewModel({ switchingTo: other })
    renderScreen()

    fireEvent.press(row('https://mediator-dev.example/invite'))
    fireEvent.press(removeControl('https://mediator-dev.example/invite'))
    fireEvent.press(screen.getByTestId(testIdWithKey(TestIds.main.configureMediator.scan)))

    expect(viewModel.selectMediator).not.toHaveBeenCalled()
    expect(viewModel.removeMediator).not.toHaveBeenCalled()
    expect(viewModel.scanMediator).not.toHaveBeenCalled()
  })
})
