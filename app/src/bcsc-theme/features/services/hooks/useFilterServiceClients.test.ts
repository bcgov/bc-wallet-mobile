import * as useApi from '@/bcsc-theme/api/hooks/useApi'
import { ClientMetadata } from '@/bcsc-theme/api/hooks/useMetadataApi'
import { useFilterServiceClients } from '@/bcsc-theme/features/services/hooks/useFilterServiceClients'
import * as Bifold from '@bifold/core'
import { renderHook, waitFor } from '@testing-library/react-native'
import { BCSCCardProcess } from 'react-native-bcsc-core'

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
  allowed_identification_processes: [BCSCCardProcess.BCSCPhoto],
  bc_address: true,
  service_listing_sort_order: 2,
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
  service_listing_sort_order: 2,
}

const mockServiceClientC: ClientMetadata = {
  client_ref_id: 'test-client-id-c',
  client_name: 'TEST CLIENT CHARLIE',
  client_uri: 'https://test.client.c',
  application_type: 'web',
  claims_description: 'claims',
  suppress_confirmation_info: false,
  suppress_bookmark_prompt: false,
  allowed_identification_processes: [BCSCCardProcess.NonBCSC],
  bc_address: false,
  service_listing_sort_order: 1,
}

// Not meant to be listed: no service_listing_sort_order
const mockServiceClientD: ClientMetadata = {
  client_ref_id: 'test-client-id-d',
  client_name: 'TEST CLIENT DELTA',
  client_uri: 'https://test.client.d',
  application_type: 'web',
  claims_description: 'claims',
  suppress_confirmation_info: false,
  suppress_bookmark_prompt: false,
  allowed_identification_processes: [BCSCCardProcess.BCSCPhoto],
  bc_address: true,
  service_listing_sort_order: undefined,
}

describe('useFilterServiceClients', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('no filters', () => {
    it('should return all service clients when no filters are applied', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientB, mockServiceClientA, mockServiceClientC]),
        },
      } as any)
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() => useFilterServiceClients({}))

      expect(hook.result.current.isLoading).toBe(true)
      await waitFor(() => {
        expect(hook.result.current.serviceClients).toHaveLength(3)
      })
      expect(hook.result.current.serviceClients[0].client_ref_id).toBe(mockServiceClientC.client_ref_id)
      expect(hook.result.current.serviceClients[1].client_ref_id).toBe(mockServiceClientA.client_ref_id)
      expect(hook.result.current.serviceClients[2].client_ref_id).toBe(mockServiceClientB.client_ref_id)
      expect(hook.result.current.isLoading).toBe(false)
    })

    it('should sort by name when the sort order matches', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientA, mockServiceClientB]),
        },
      } as any)
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() => useFilterServiceClients({}))

      expect(hook.result.current.isLoading).toBe(true)
      await waitFor(() => {
        expect(hook.result.current.serviceClients).toHaveLength(2)
      })
      expect(hook.result.current.serviceClients[0].client_ref_id).toBe(mockServiceClientA.client_ref_id)
      expect(hook.result.current.serviceClients[1].client_ref_id).toBe(mockServiceClientB.client_ref_id)
      expect(hook.result.current.isLoading).toBe(false)
    })
  })

  describe('service listing sort order filter', () => {
    it('should filter out service clients without a service listing sort order', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientD, mockServiceClientC]),
        },
      } as any)
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() => useFilterServiceClients({}))

      expect(hook.result.current.isLoading).toBe(true)
      await waitFor(() => {
        expect(hook.result.current.serviceClients).toHaveLength(1)
      })
      expect(hook.result.current.serviceClients[0].client_ref_id).toBe(mockServiceClientC.client_ref_id)
      expect(hook.result.current.isLoading).toBe(false)
    })

    it('should keep service clients without a service listing sort order when they are saved', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientD, mockServiceClientC]),
        },
      } as any)
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() =>
        useFilterServiceClients({ savedServiceClientIds: [mockServiceClientD.client_ref_id] })
      )

      expect(hook.result.current.isLoading).toBe(true)
      await waitFor(() => {
        expect(hook.result.current.serviceClients).toHaveLength(2)
      })
      // Unlisted services sort to the end
      expect(hook.result.current.serviceClients[0].client_ref_id).toBe(mockServiceClientC.client_ref_id)
      expect(hook.result.current.serviceClients[1].client_ref_id).toBe(mockServiceClientD.client_ref_id)
      expect(hook.result.current.isLoading).toBe(false)
    })

    it('should still apply the other filters to saved service clients', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientD]),
        },
      } as any)
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() =>
        useFilterServiceClients({
          cardProcessFilter: BCSCCardProcess.NonBCSC,
          savedServiceClientIds: [mockServiceClientD.client_ref_id],
        })
      )

      expect(hook.result.current.isLoading).toBe(true)
      await waitFor(() => {
        expect(hook.result.current.serviceClients).toHaveLength(0)
        expect(hook.result.current.isLoading).toBe(false)
      })
    })
  })

  describe('card process filter', () => {
    it('should filter out service clients by card process', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientA, mockServiceClientB]),
        },
      } as any)
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() => useFilterServiceClients({ cardProcessFilter: BCSCCardProcess.BCSCPhoto }))

      expect(hook.result.current.isLoading).toBe(true)
      await waitFor(() => {
        expect(hook.result.current.serviceClients).toHaveLength(1)
      })
      expect(hook.result.current.serviceClients[0].client_ref_id).toBe(mockServiceClientA.client_ref_id)
      expect(hook.result.current.isLoading).toBe(false)
    })
  })

  describe('BC address filter', () => {
    it('should filter out non BC service clients', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientA, mockServiceClientB]),
        },
      } as any)
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() => useFilterServiceClients({ requireBCAddressFilter: true }))

      expect(hook.result.current.isLoading).toBe(true)
      await waitFor(() => {
        expect(hook.result.current.serviceClients).toHaveLength(1)
      })
      expect(hook.result.current.serviceClients[0].client_ref_id).toBe(mockServiceClientA.client_ref_id)
      expect(hook.result.current.isLoading).toBe(false)
    })
  })

  describe('partial name filter', () => {
    it('should filter service clients by partial name match', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientA, mockServiceClientB]),
        },
      } as any)
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() => useFilterServiceClients({ partialNameFilter: 'ALPHA' }))

      expect(hook.result.current.isLoading).toBe(true)
      await waitFor(() => {
        expect(hook.result.current.serviceClients).toHaveLength(1)
      })
      expect(hook.result.current.serviceClients[0].client_ref_id).toBe(mockServiceClientA.client_ref_id)
      expect(hook.result.current.isLoading).toBe(false)
    })

    it('should filter service clients by partial name match (case insensitive)', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientA, mockServiceClientB]),
        },
      } as any)
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() => useFilterServiceClients({ partialNameFilter: 'Alpha' }))

      expect(hook.result.current.isLoading).toBe(true)
      await waitFor(() => {
        expect(hook.result.current.serviceClients).toHaveLength(1)
      })
      expect(hook.result.current.serviceClients[0].client_ref_id).toBe(mockServiceClientA.client_ref_id)
      expect(hook.result.current.isLoading).toBe(false)
    })

    it('should filter service clients by partial name match multiple words', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientA, mockServiceClientB]),
        },
      } as any)
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() => useFilterServiceClients({ partialNameFilter: 'client alpha' }))

      expect(hook.result.current.isLoading).toBe(true)
      await waitFor(() => {
        expect(hook.result.current.serviceClients).toHaveLength(1)
      })
      expect(hook.result.current.serviceClients[0].client_ref_id).toBe(mockServiceClientA.client_ref_id)
      expect(hook.result.current.isLoading).toBe(false)
    })

    it('should return no service clients when no match', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientA, mockServiceClientB]),
        },
      } as any)
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() => useFilterServiceClients({ partialNameFilter: 'badbadbad' }))

      expect(hook.result.current.isLoading).toBe(true)
      await waitFor(() => {
        expect(hook.result.current.serviceClients).toHaveLength(0)
        expect(hook.result.current.isLoading).toBe(false)
      })
    })

    it('should return no service clients when partial name words are not contiguous', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientA, mockServiceClientB]),
        },
      } as any)
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() => useFilterServiceClients({ partialNameFilter: 'TEST ALPHA' }))

      expect(hook.result.current.isLoading).toBe(true)
      await waitFor(() => {
        expect(hook.result.current.serviceClients).toHaveLength(0)
        expect(hook.result.current.isLoading).toBe(false)
      })
    })
  })

  describe('combined filters', () => {
    it('should filter service clients by multiple criteria', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientA, mockServiceClientB]),
        },
      } as any)
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() =>
        useFilterServiceClients({
          cardProcessFilter: BCSCCardProcess.BCSCPhoto,
          requireBCAddressFilter: true,
          partialNameFilter: 'ALPHA',
        })
      )

      expect(hook.result.current.isLoading).toBe(true)
      await waitFor(() => {
        expect(hook.result.current.serviceClients).toHaveLength(1)
      })
      expect(hook.result.current.serviceClients[0].client_ref_id).toBe(mockServiceClientA.client_ref_id)
      expect(hook.result.current.isLoading).toBe(false)
    })

    it('should filter service clients by multiple criteria and return zero when one filter misses', async () => {
      const bifoldMock = jest.mocked(Bifold)
      const useApiMock = jest.mocked(useApi)

      useApiMock.default.mockReturnValue({
        metadata: {
          getClientMetadata: jest.fn().mockResolvedValue([mockServiceClientA, mockServiceClientB]),
        },
      } as any)
      bifoldMock.useServices.mockReturnValue([{ error: jest.fn() }] as any)

      const hook = renderHook(() =>
        useFilterServiceClients({
          cardProcessFilter: BCSCCardProcess.NonBCSC,
          requireBCAddressFilter: true,
          partialNameFilter: 'ALPHA',
        })
      )

      expect(hook.result.current.isLoading).toBe(true)
      await waitFor(() => {
        expect(hook.result.current.serviceClients).toHaveLength(0)
        expect(hook.result.current.isLoading).toBe(false)
      })
    })
  })
})
