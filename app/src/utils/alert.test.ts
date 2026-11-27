import { withAlert } from '@/utils/alert'

describe('withAlert', () => {
  it('should return the result of the wrapped function on success', async () => {
    const fn = jest.fn().mockResolvedValue('result')
    const alert = jest.fn()

    const wrapped = withAlert(fn, alert)
    const result = await wrapped('arg1', 'arg2')

    expect(result).toBe('result')
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
    expect(alert).not.toHaveBeenCalled()
  })

  it('should call alert and rethrow when wrapped function throws', async () => {
    const error = new Error('test error')
    const fn = jest.fn().mockRejectedValue(error)
    const alert = jest.fn()

    const wrapped = withAlert(fn, alert)

    await expect(wrapped()).rejects.toThrow(error)
    expect(alert).toHaveBeenCalledTimes(1)
  })
})
