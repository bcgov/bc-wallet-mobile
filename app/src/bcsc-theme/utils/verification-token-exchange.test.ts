import { AppEventCode } from '@/events/appEventCode'
import { mockAppError } from '@mocks/helpers/error'
import { isVerifiedByTokenExchange } from './verification-token-exchange'

describe('isVerifiedByTokenExchange', () => {
  it('returns true when the exchange resolves', async () => {
    const exchange = jest.fn().mockResolvedValue(undefined)

    await expect(isVerifiedByTokenExchange(exchange)).resolves.toBe(true)
    expect(exchange).toHaveBeenCalledTimes(1)
  })

  it.each([AppEventCode.AUTHORIZATION_PENDING, AppEventCode.VERIFY_NOT_COMPLETE])(
    'returns false when the exchange rejects with %s',
    async (code) => {
      const exchange = jest.fn().mockRejectedValue(mockAppError(code))

      await expect(isVerifiedByTokenExchange(exchange)).resolves.toBe(false)
    }
  )

  it('rethrows ALREADY_VERIFIED because no tokens were issued', async () => {
    const error = mockAppError(AppEventCode.ALREADY_VERIFIED)

    await expect(isVerifiedByTokenExchange(jest.fn().mockRejectedValue(error))).rejects.toBe(error)
  })

  it('rethrows any other AppError', async () => {
    const error = mockAppError(AppEventCode.GENERAL)

    await expect(isVerifiedByTokenExchange(jest.fn().mockRejectedValue(error))).rejects.toBe(error)
  })

  it('rethrows a plain Error', async () => {
    const error = new Error('network down')

    await expect(isVerifiedByTokenExchange(jest.fn().mockRejectedValue(error))).rejects.toBe(error)
  })
})
