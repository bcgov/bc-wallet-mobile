import { removeLegacyTxnCache } from '@/utils/legacy-txn-cache'
import { MockLogger } from '@bifold/core'
import RNFS from 'react-native-fs'

jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/caches',
  exists: jest.fn(),
  unlink: jest.fn(),
}))

describe('removeLegacyTxnCache', () => {
  const logger = new MockLogger()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(logger, 'error').mockImplementation(() => undefined)
  })

  it('deletes the txn-cache folder when it exists', async () => {
    jest.mocked(RNFS.exists).mockResolvedValue(true)
    jest.mocked(RNFS.unlink).mockResolvedValue(undefined)

    await removeLegacyTxnCache(logger)

    expect(RNFS.exists).toHaveBeenCalledWith('/caches/txn-cache')
    expect(RNFS.unlink).toHaveBeenCalledWith('/caches/txn-cache')
  })

  it('does nothing when the folder is missing', async () => {
    jest.mocked(RNFS.exists).mockResolvedValue(false)

    await expect(removeLegacyTxnCache(logger)).resolves.toBeUndefined()

    expect(RNFS.unlink).not.toHaveBeenCalled()
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('logs and resolves when the delete fails', async () => {
    jest.mocked(RNFS.exists).mockResolvedValue(true)
    jest.mocked(RNFS.unlink).mockRejectedValue(new Error('EBUSY'))

    await expect(removeLegacyTxnCache(logger)).resolves.toBeUndefined()

    expect(logger.error).toHaveBeenCalled()
  })

  it('retries on the next launch after a failed delete', async () => {
    jest.mocked(RNFS.exists).mockResolvedValue(true)
    jest.mocked(RNFS.unlink).mockRejectedValueOnce(new Error('EBUSY')).mockResolvedValueOnce(undefined)

    await removeLegacyTxnCache(logger)
    await removeLegacyTxnCache(logger)

    expect(RNFS.unlink).toHaveBeenCalledTimes(2)
    expect(RNFS.unlink).toHaveBeenNthCalledWith(2, '/caches/txn-cache')
    expect(logger.error).toHaveBeenCalledTimes(1)
  })
})
