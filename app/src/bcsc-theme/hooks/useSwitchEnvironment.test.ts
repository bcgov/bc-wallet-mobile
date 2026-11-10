import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { BCDispatchAction } from '@/store'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { IASEnvironment } from '@/utils/environment'
import { useServices, useStore } from '@bifold/core'
import { renderHook } from '@testing-library/react-native'
import { setIssuer } from 'react-native-bcsc-core'
import { useSwitchEnvironment } from './useSwitchEnvironment'

jest.mock('@/bcsc-theme/api/hooks/useFactoryReset')
jest.mock('@/utils/analytics/analytics-singleton', () => ({ Analytics: { setAppId: jest.fn() } }))
jest.mock('react-native-bcsc-core', () => ({ setIssuer: jest.fn() }))
jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
  useServices: jest.fn(),
  useStore: jest.fn(),
}))

describe('useSwitchEnvironment', () => {
  const setup = (factoryResetResult: { success: true } | { success: false; error: Error }) => {
    const dispatch = jest.fn()
    const logger = { info: jest.fn(), error: jest.fn() }
    jest.mocked(useStore).mockReturnValue([{}, dispatch] as any)
    jest.mocked(useServices).mockReturnValue([logger] as any)
    jest.mocked(useFactoryReset).mockReturnValue(jest.fn().mockResolvedValue(factoryResetResult))
    jest.mocked(setIssuer).mockResolvedValue(true)

    const { result } = renderHook(() => useSwitchEnvironment())

    return { switchEnvironment: result.current, dispatch, logger }
  }

  it('switches the environment when the factory reset succeeds', async () => {
    const { switchEnvironment, dispatch } = setup({ success: true })

    await switchEnvironment(IASEnvironment.SIT)

    expect(setIssuer).toHaveBeenCalledWith(IASEnvironment.SIT.iasApiBaseUrl)
    expect(dispatch).toHaveBeenCalledWith({ type: BCDispatchAction.UPDATE_ENVIRONMENT, payload: [IASEnvironment.SIT] })
  })

  it('does not switch the environment when the factory reset fails', async () => {
    const error = new Error('reset failed')
    const { switchEnvironment, dispatch, logger } = setup({ success: false, error })

    await switchEnvironment(IASEnvironment.SIT)

    expect(setIssuer).not.toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Factory reset failed'), error)
  })

  it('does not switch the environment when the issuer fails to persist', async () => {
    const { switchEnvironment, dispatch, logger } = setup({ success: true })
    jest.mocked(setIssuer).mockResolvedValue(false)

    await switchEnvironment(IASEnvironment.SIT)

    expect(dispatch).not.toHaveBeenCalled()
    expect(Analytics.setAppId).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to persist issuer'))
  })
})
