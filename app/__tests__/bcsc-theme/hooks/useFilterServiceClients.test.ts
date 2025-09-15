import * as Bifold from '@bifold/core'
import { useFilterServiceClients } from '@/bcsc-theme/features/services/hooks/useFilterServiceClients'
import { renderHook, waitFor } from '@testing-library/react-native'
import * as useApi from '@/bcsc-theme/api/hooks/useApi'
import * as navigation from '@react-navigation/native'
import { ClientMetadata } from '@/bcsc-theme/api/hooks/useMetadataApi'
import { BCSCCardProcess } from '@/bcsc-theme/types/cards'

jest.mock('@bifold/core')
jest.mock('@/bcsc-theme/api/hooks/useApi')
jest.mock('@react-navigation/native')

const mockServiceClientA: ClientMetadata = {
  client_ref_id: 'test-client-id-a',
  client_name: 'TEST CLIENT ALPHA',
  client_uri: 'https://test.client.a',
  application_type: 'web',
  claims_description: 'claims',
  suppress_confirmation_info: false,
  suppress_bookmark_prompt: false,
  allowed_identification_processes: [BCSCCardProcess.BCSC],
  bc_address: true,
}

const mockServiceClientB: ClientMetadata = {
  client_ref_id: 'test-client-id-b',
  client_name: 'TEST CLIENT BETA',
  client_uri: 'https://test.client.b',
  application_type: 'web',
  claims_description: 'claims',
  suppress_confirmation_info: false,
  suppress_bookmark_prompt: false,
  allowed_identification_processes: [BCSCCardProcess.NonBCSC],
  bc_address: false,
}

describe('useFilterServiceClients', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('no filters', () => {
    it('should return all service clients when no filters are applied', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)
      const navigationMock = jest.mocked(navigation)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientA, mockServiceClientB]),
        },
      } as any)
      navigationMock.useNavigation.mockReturnValue({ navigation: jest.fn() })
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() => useFilterServiceClients({}))

      await waitFor(() => {
        expect(hook.result.current).toHaveLength(2)
        expect(hook.result.current[0].client_ref_id).toBe(mockServiceClientA.client_ref_id)
        expect(hook.result.current[1].client_ref_id).toBe(mockServiceClientB.client_ref_id)
      })
    })
  })

  describe('card process filter', () => {
    it('should filter out service clients by card process', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)
      const navigationMock = jest.mocked(navigation)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientA, mockServiceClientB]),
        },
      } as any)
      navigationMock.useNavigation.mockReturnValue({ navigation: jest.fn() })
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() => useFilterServiceClients({ cardProcessFilter: BCSCCardProcess.BCSC }))

      await waitFor(() => {
        expect(hook.result.current).toHaveLength(1)
        expect(hook.result.current[0].client_ref_id).toBe(mockServiceClientA.client_ref_id)
      })
    })
  })

  describe('BC address filter', () => {
    it('should filter out non BC service clients', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)
      const navigationMock = jest.mocked(navigation)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientA, mockServiceClientB]),
        },
      } as any)
      navigationMock.useNavigation.mockReturnValue({ navigation: jest.fn() })
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() => useFilterServiceClients({ requireBCAddressFilter: true }))

      await waitFor(() => {
        expect(hook.result.current).toHaveLength(1)
        expect(hook.result.current[0].client_ref_id).toBe(mockServiceClientA.client_ref_id)
      })
    })
  })

  describe('partial name filter', () => {
    it('should filter service clients by partial name match', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)
      const navigationMock = jest.mocked(navigation)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientA, mockServiceClientB]),
        },
      } as any)
      navigationMock.useNavigation.mockReturnValue({ navigation: jest.fn() })
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() => useFilterServiceClients({ partialNameFilter: 'ALPHA' }))

      await waitFor(() => {
        expect(hook.result.current).toHaveLength(1)
        expect(hook.result.current[0].client_ref_id).toBe(mockServiceClientA.client_ref_id)
      })
    })

    it('should filter service clients by partial name match (case insensitive)', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)
      const navigationMock = jest.mocked(navigation)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientA, mockServiceClientB]),
        },
      } as any)
      navigationMock.useNavigation.mockReturnValue({ navigation: jest.fn() })
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() => useFilterServiceClients({ partialNameFilter: 'Alpha' }))

      await waitFor(() => {
        expect(hook.result.current).toHaveLength(1)
        expect(hook.result.current[0].client_ref_id).toBe(mockServiceClientA.client_ref_id)
      })
    })

    it('should filter service clients by partial name match multiple words', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)
      const navigationMock = jest.mocked(navigation)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientA, mockServiceClientB]),
        },
      } as any)
      navigationMock.useNavigation.mockReturnValue({ navigation: jest.fn() })
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() => useFilterServiceClients({ partialNameFilter: 'client alpha' }))

      await waitFor(() => {
        expect(hook.result.current).toHaveLength(1)
        expect(hook.result.current[0].client_ref_id).toBe(mockServiceClientA.client_ref_id)
      })
    })

    it('should return no service clients when no match', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)
      const navigationMock = jest.mocked(navigation)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientA, mockServiceClientB]),
        },
      } as any)
      navigationMock.useNavigation.mockReturnValue({ navigation: jest.fn() })
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() => useFilterServiceClients({ partialNameFilter: 'badbadbad' }))

      await waitFor(() => {
        expect(hook.result.current).toHaveLength(0)
      })
    })

    it('should return no service clients when partial name words are not contiguous', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)
      const navigationMock = jest.mocked(navigation)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientA, mockServiceClientB]),
        },
      } as any)
      navigationMock.useNavigation.mockReturnValue({ navigation: jest.fn() })
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() => useFilterServiceClients({ partialNameFilter: 'TEST ALPHA' }))

      await waitFor(() => {
        expect(hook.result.current).toHaveLength(0)
      })
    })
  })

  describe('combined filters', () => {
    it('should filter service clients by multiple criteria', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)
      const navigationMock = jest.mocked(navigation)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientA, mockServiceClientB]),
        },
      } as any)
      navigationMock.useNavigation.mockReturnValue({ navigation: jest.fn() })
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() =>
        useFilterServiceClients({
          cardProcessFilter: BCSCCardProcess.BCSC,
          requireBCAddressFilter: true,
          partialNameFilter: 'ALPHA',
        })
      )

      await waitFor(() => {
        expect(hook.result.current).toHaveLength(1)
        expect(hook.result.current[0].client_ref_id).toBe(mockServiceClientA.client_ref_id)
      })
    })

    it('should filter service clients by multiple criteria and return zero when one filter misses', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)
      const navigationMock = jest.mocked(navigation)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientA, mockServiceClientB]),
        },
      } as any)
      navigationMock.useNavigation.mockReturnValue({ navigation: jest.fn() })
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() =>
        useFilterServiceClients({
          cardProcessFilter: BCSCCardProcess.NonBCSC,
          requireBCAddressFilter: true,
          partialNameFilter: 'ALPHA',
        })
      )

      await waitFor(() => {
        expect(hook.result.current).toHaveLength(0)
      })
    })
  })
})
