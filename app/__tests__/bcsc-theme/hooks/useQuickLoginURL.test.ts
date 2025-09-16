import * as useApi from '@/bcsc-theme/api/hooks/useApi'
import * as useBCSCApiClient from '@/bcsc-theme/hooks/useBCSCApiClient'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import { useQuickLoginURL } from '@/bcsc-theme/hooks/useQuickLoginUrl'
import * as Bifold from '@bifold/core'
import { renderHook, waitFor } from '@testing-library/react-native'

jest.mock('@bifold/core')
jest.mock('@/bcsc-theme/api/hooks/useApi')
jest.mock('@/bcsc-theme/hooks/useBCSCApiClient')
jest.mock('@/bcsc-theme/hooks/useDataLoader')

describe('useQuickLoginURL', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should return no url or error when data loaders not ready', async () => {
    const useApiMock = jest.mocked(useApi)
    const useClientMock = jest.mocked(useBCSCApiClient)
    const bifoldMock = jest.mocked(Bifold)
    const useDataLoaderMock = jest.mocked(useDataLoader)

    useApiMock.default.mockReturnValue({ jwks: { getFirstJwk: jest.fn() } } as any)
    useClientMock.useBCSCApiClient.mockReturnValue({} as any)
    bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

    const jwkLoaderMock: any = { load: jest.fn(), isReady: false, data: 'A' }
    const tokensLoaderMock: any = { load: jest.fn(), isReady: true, data: 'B' }
    const accountLoaderMock: any = { load: jest.fn(), isReady: true, data: 'C' }

    useDataLoaderMock
      .mockReturnValueOnce(jwkLoaderMock)
      .mockReturnValueOnce(tokensLoaderMock)
      .mockReturnValueOnce(accountLoaderMock)

    const hook = renderHook(() => useQuickLoginURL({ client_ref_id: '' }))

    // Wait for useEffect to run
    await waitFor(() => {
      const [url, error] = hook.result.current

      expect(url).toBeNull()
      expect(error).toBeNull()
    })

    // Ensure load functions were called
    expect(jwkLoaderMock.load).toHaveBeenCalledTimes(1)
    expect(tokensLoaderMock.load).toHaveBeenCalledTimes(1)
    expect(accountLoaderMock.load).toHaveBeenCalledTimes(1)
  })

  // TODO (MD): Add more tests (having difficulty with dataLoader mocks...)
})
