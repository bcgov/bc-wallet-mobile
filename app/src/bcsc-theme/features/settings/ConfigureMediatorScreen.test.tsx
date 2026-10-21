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
    { url: current, label: 'BC Mediator (Test)', host: 'https://mediator.example/invite', selected: true },
    {
      url: other,
      label: 'https://mediator-dev.example/invite',
      host: 'https://mediator-dev.example/invite',
      selected: false,
    },
  ],
  switchingTo: null,
  descriptionText: 'description',
  scanButtonText: 'scan',
  selectMediator: jest.fn(),
  scanMediator: jest.fn(),
  ...overrides,
})

const row = (label: string) =>
  screen.getByTestId(testIdWithKey(`${TestIds.main.configureMediator.mediatorRowPrefix}${label}`))

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

  it('opens the scanner from the scan button', () => {
    renderScreen()

    fireEvent.press(screen.getByTestId(testIdWithKey(TestIds.main.configureMediator.scan)))

    expect(viewModel.scanMediator).toHaveBeenCalled()
  })

  it('disables the rows and the scan button while a switch is in progress', () => {
    viewModel = makeViewModel({ switchingTo: other })
    renderScreen()

    fireEvent.press(row('https://mediator-dev.example/invite'))
    fireEvent.press(screen.getByTestId(testIdWithKey(TestIds.main.configureMediator.scan)))

    expect(viewModel.selectMediator).not.toHaveBeenCalled()
    expect(viewModel.scanMediator).not.toHaveBeenCalled()
  })
})
