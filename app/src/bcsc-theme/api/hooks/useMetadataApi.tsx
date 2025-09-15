import { useCallback, useMemo } from 'react'
import apiClient from '../client'

export type Clients = ClientMetadata[]

export type MetadataResponseData = {
  clients: Clients
}

/**
 * Client metadata as returned by the IAS Client Metadata endpoint.
 *
 * @see https://citz-cdt.atlassian.net/wiki/spaces/BMS/pages/301574688/5.1+System+Interfaces#IAS-Client-Metadata-endpoint
 */
export interface ClientMetadata {
  client_ref_id: string
  client_name: string
  client_uri: string
  application_type: string
  claims_description: string
  suppress_confirmation_info: boolean
  suppress_bookmark_prompt: boolean
  allowed_identification_processes: string[]
  bc_address: boolean
  initiate_login_uri?: string
  client_description?: string
  policy_uri?: string
  service_listing_sort_order?: number
}

const useMetadataApi = () => {
  /**
   * Fetches the client metadata from the IAS Client Metadata endpoint.
   *
   * @return {*} {Promise<ClientMetadata[]>} A promise that resolves to an array of client metadata objects.
   */
  const getClientMetadata = useCallback(async (): Promise<ClientMetadata[]> => {
    const {
      data: { clients },
    } = await apiClient.get<MetadataResponseData>(apiClient.endpoints.clientMetadata)
    return clients
  }, [])

  /**
   * Fetches the client metadata for the BCSC application specifically.
   *
   * @return {*} {Promise<ClientMetadata | null>} A promise that resolves to the BCSC client metadata object, or null if not found.
   */
  const getBCSCClientMetadata = useCallback(async (): Promise<ClientMetadata | null> => {
    const clients = await getClientMetadata()
    const bcscClient = clients.find((client) => client.client_uri === `${apiClient.baseURL}/account/`)

    if (!bcscClient) {
      throw new Error('BCSC client metadata not found')
    }

    return bcscClient
  }, [])

  return useMemo(
    () => ({
      getClientMetadata,
      getBCSCClientMetadata,
    }),
    [getClientMetadata, getBCSCClientMetadata]
  )
}

export default useMetadataApi
