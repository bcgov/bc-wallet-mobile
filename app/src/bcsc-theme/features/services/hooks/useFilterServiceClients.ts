import useApi from '@/bcsc-theme/api/hooks/useApi'
import { ClientMetadata } from '@/bcsc-theme/api/hooks/useMetadataApi'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import { BCSCCardProcess } from '@/bcsc-theme/types/cards'
import { TOKENS, useServices } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { useEffect, useMemo, useRef } from 'react'
import { Alert } from 'react-native'

interface FilterServiceClientsResult {
  serviceClients: ClientMetadata[]
  isLoading: boolean
}

export interface ServiceClientsFilter {
  /**
   * A string to filter service clients by their name (case insensitive, partial match).
   *
   * Note: This filter could be upgraded to support more advanced matching (eg: fuzzy matching, word boundaries, etc.)
   *
   * @example "BC" would match "BC Services Card", "My BC Service", etc.
   * "BC Card" would not match "BC Services Card" because the words are not contiguous.
   * @type {string}
   */
  partialNameFilter?: string
  /**
   * Filter service clients based on the user's card process type.
   *
   * Note: Explicitly setting this to null will return no services.
   *
   * @see card-utils.ts->getCardProcessForCardType
   * @example BCSCCardProcess.NonPhoto would filter out services that do not support non-photo cards
   * @type {BCSCCardProcess | null}
   */
  cardProcessFilter?: BCSCCardProcess | null
  /**
   * Filter service clients that require a BC Address on file
   *
   * @type {boolean}
   */
  requireBCAddressFilter?: boolean
  /**
   * An optional list of service client ref ids to filter by
   * if provided, only service clients with these IDs will be included
   * ie: saved services (bookmarks)
   *
   * @format uuid
   * @type {string[]}
   */
  serviceClientIdsFilter?: string[]
}

/**
 * A custom hook to filter service clients based on various criteria such as name,
 * card process, and BC address requirement. Sorted by numeric listing order and name.
 *
 * @param {ServiceClientsFilter} filter The filter criteria to apply to the service clients.
 * @returns {*} {FilterServiceClientsResult} The filtered list of service clients and loading state.
 */
export const useFilterServiceClients = (filter: ServiceClientsFilter): FilterServiceClientsResult => {
  const { metadata } = useApi()
  const navigation = useNavigation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const filteringDoneRef = useRef(false)

  const {
    data: serviceClients,
    load,
    isReady,
    isLoading,
  } = useDataLoader<ClientMetadata[]>(() => metadata.getClientMetadata(), {
    onError: (error) => {
      logger.error('Error loading services', error as Error)
      filteringDoneRef.current = true
    },
  })

  useEffect(() => {
    load()
  }, [load])

  // Alert the user if services fail to load
  if (!serviceClients && isReady) {
    Alert.alert('Failed to load services', 'Please try again later.', [
      {
        text: 'OK',
        onPress: () => {
          navigation.goBack()
        },
      },
    ])
  }

  // Apply filters to the service clients (these filters are memoized to avoid unnecessary recalculations)
  const filteredServiceClients = useMemo(() => {
    if (!serviceClients || filter.cardProcessFilter === null) {
      return []
    }

    let serviceClientsCopy = serviceClients

    // Filter services based on the card process
    if (filter.cardProcessFilter) {
      serviceClientsCopy = serviceClientsCopy.filter((service) =>
        service.allowed_identification_processes.includes(filter.cardProcessFilter!)
      )
    }

    // Filter services that require a BC Address
    if (filter.requireBCAddressFilter) {
      serviceClientsCopy = serviceClientsCopy.filter((service) => service.bc_address === true)
    }

    // Filter services based on the provided IDs
    if (filter.serviceClientIdsFilter) {
      const idsSet = new Set(filter.serviceClientIdsFilter)
      serviceClientsCopy = serviceClientsCopy.filter((service) => idsSet.has(service.client_ref_id))
    }

    // Sort services by their listing order, then alphabetically by name
    return _sortServiceClients(serviceClientsCopy)
  }, [serviceClients, filter.cardProcessFilter, filter.requireBCAddressFilter, filter.serviceClientIdsFilter])

  // Further filter services based on the partial name filter
  const queriedServiceClients = useMemo(() => {
    const newServiceClients = _queryServiceClientsByName(filteredServiceClients, filter.partialNameFilter)

    filteringDoneRef.current = true

    return newServiceClients
  }, [filteredServiceClients, filter])

  return {
    serviceClients: queriedServiceClients,
    isLoading: isLoading || !filteringDoneRef.current,
  }
}

/**
 * Filters the given list of service clients by their name using a case-insensitive partial match.
 *
 * @param {ClientMetadata[]} serviceClients - The list of service clients to filter.
 * @param {string} [query] - The partial name to filter by.
 * @returns {*} {ClientMetadata[]} The filtered list of service clients whose names match the query.
 */
function _queryServiceClientsByName(serviceClients: ClientMetadata[], query?: string): ClientMetadata[] {
  const caseInsensitiveQuery = query?.toLowerCase().trim()

  // Return all supported services when there's no search text
  if (!caseInsensitiveQuery) {
    return serviceClients
  }

  return serviceClients.filter((service) => service.client_name.toLowerCase().includes(caseInsensitiveQuery))
}

/**
 * Sorts the given list of service clients first by their numeric service listing sort order (ascending),
 * and then alphabetically by their name (A-Z) for services with the same sort order.
 *
 * Services without a defined sort order are placed at the end of the list.
 *
 * @param {ClientMetadata[]} serviceClients - The list of service clients to sort.
 * @returns {*} {ClientMetadata[]} The sorted list of service clients.
 */
function _sortServiceClients(serviceClients: ClientMetadata[]): ClientMetadata[] {
  return serviceClients.sort((a, b) => {
    const orderA = a.service_listing_sort_order ?? Number.MAX_SAFE_INTEGER
    const orderB = b.service_listing_sort_order ?? Number.MAX_SAFE_INTEGER

    if (orderA !== orderB) {
      return orderA - orderB
    }

    return a.client_name.localeCompare(b.client_name)
  })
}
