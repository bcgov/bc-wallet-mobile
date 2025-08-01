import { useCallback, useMemo } from 'react'
import apiClient from '../client'

export type Clients = ClientMetadata[]

export type MetadataResponseData = {
  clients: Clients
}

export interface ClientMetadata {
  client_ref_id: string,
  client_name: string,
  policy_uri: string,
  client_uri: string,
  initiate_login_uri: string,
  application_type: string,
  client_description: string,
  claims_description: string,
  service_listing_sort_order: number,
  suppress_confirmation_info: boolean,
  suppress_bookmark_prompt: boolean,
  allowed_identification_processes: string[]
}

const useMetadataApi = () => {
  const getClientMetadata = useCallback(async (): Promise<Clients> => {
    const { data: { clients } } = await apiClient.get<MetadataResponseData>(apiClient.endpoints.clientMetadata)
    return clients
  }, [])

  return useMemo(
    () => ({
      getClientMetadata,
    }),
    [getClientMetadata],
  )
}

export default useMetadataApi