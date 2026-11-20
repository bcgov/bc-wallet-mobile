import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { purgeWalletStore } from '@/bcsc-theme/features/agent/services/agent-service'
import { storage, type OpenResult } from '@/bcsc-theme/storage'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'
import { StorageGate } from './StorageGate'

jest.mock('@/bcsc-theme/storage/startup', () => ({ runStartupTasks: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/bcsc-theme/features/agent/services/agent-service', () => ({ purgeWalletStore: jest.fn() }))

const blocked: OpenResult = { status: 'not-ready', reason: 'store-unreadable' } as OpenResult
const ok: OpenResult = { status: 'ok' } as OpenResult

const renderGate = () =>
  render(
    <BasicAppContext>
      <BCSCLoadingProvider>
        <StorageGate>
          <Text>App</Text>
        </StorageGate>
      </BCSCLoadingProvider>
    </BasicAppContext>
  )

describe('StorageGate', () => {
  it('opens the app once storage is open', async () => {
    jest.spyOn(storage, 'open').mockResolvedValue(ok)
    renderGate()
    expect(await screen.findByText('App')).toBeTruthy()
    expect(storage.store.getState().session.stateLoaded).toBe(true)
  })

  it('tries a blocked open again quietly before showing an error (#3372)', async () => {
    const open = jest
      .spyOn(storage, 'open')
      .mockResolvedValueOnce(blocked)
      .mockResolvedValueOnce(blocked)
      .mockResolvedValue(ok)
    renderGate()
    await waitFor(() => expect(screen.getByText('App')).toBeTruthy(), { timeout: 3000 })
    expect(open).toHaveBeenCalledTimes(3)
    expect(screen.queryByTestId(testIdWithKey(TestIds.systemModal.storage.retry))).toBeNull()
  })

  it('shows the error with a retry once the quiet retries are used up', async () => {
    const open = jest.spyOn(storage, 'open').mockResolvedValue(blocked)
    renderGate()
    await waitFor(() => expect(screen.getByTestId(testIdWithKey(TestIds.systemModal.storage.retry))).toBeTruthy(), {
      timeout: 3000,
    })
    expect(open).toHaveBeenCalledTimes(3)
    expect(screen.queryByText('App')).toBeNull()
  })

  const retryButton = () => screen.getByTestId(testIdWithKey(TestIds.systemModal.storage.retry))

  it('shows no reset before the user has tried again', async () => {
    jest.spyOn(storage, 'open').mockResolvedValue(blocked)
    renderGate()
    await waitFor(() => expect(retryButton()).toBeTruthy(), { timeout: 3000 })
    expect(screen.queryByText('Alerts.FactoryReset.Title')).toBeNull()
  })

  it('offers a report and a reset when Retry fails too', async () => {
    jest.spyOn(storage, 'open').mockResolvedValue(blocked)
    renderGate()
    await waitFor(() => expect(retryButton()).toBeTruthy(), { timeout: 3000 })

    fireEvent.press(retryButton())

    expect(await screen.findByText('Alerts.FactoryReset.Title', {}, { timeout: 3000 })).toBeTruthy()
    expect(screen.getByText('Alerts.FactoryReset.Action1')).toBeTruthy()
  })

  it('purges the wallet, wipes the device and opens again when the user resets', async () => {
    const open = jest.spyOn(storage, 'open').mockResolvedValue(blocked)
    const wipe = jest.spyOn(storage, 'wipe').mockResolvedValue(undefined)
    jest.mocked(purgeWalletStore).mockResolvedValue(undefined)
    renderGate()
    await waitFor(() => expect(retryButton()).toBeTruthy(), { timeout: 3000 })
    fireEvent.press(retryButton())
    const reset = await screen.findByText('Alerts.FactoryReset.Action1', {}, { timeout: 3000 })
    open.mockResolvedValue(ok)

    fireEvent.press(reset)

    expect(await screen.findByText('App', {}, { timeout: 3000 })).toBeTruthy()
    expect(purgeWalletStore).toHaveBeenCalledWith(
      expect.objectContaining({ walletSecret: expect.objectContaining({ id: 'bc-wallet-bcsc' }) })
    )
    expect(jest.mocked(purgeWalletStore).mock.invocationCallOrder[0]).toBeLessThan(wipe.mock.invocationCallOrder[0])
    expect(wipe).toHaveBeenCalledTimes(1)
  })

  it('still wipes when there is no wallet to purge', async () => {
    const open = jest.spyOn(storage, 'open').mockResolvedValue(blocked)
    const wipe = jest.spyOn(storage, 'wipe').mockResolvedValue(undefined)
    jest.mocked(purgeWalletStore).mockRejectedValue(new Error('no store'))
    renderGate()
    await waitFor(() => expect(retryButton()).toBeTruthy(), { timeout: 3000 })
    fireEvent.press(retryButton())
    const reset = await screen.findByText('Alerts.FactoryReset.Action1', {}, { timeout: 3000 })
    open.mockResolvedValue(ok)

    fireEvent.press(reset)

    expect(await screen.findByText('App', {}, { timeout: 3000 })).toBeTruthy()
    expect(wipe).toHaveBeenCalledTimes(1)
  })
})
