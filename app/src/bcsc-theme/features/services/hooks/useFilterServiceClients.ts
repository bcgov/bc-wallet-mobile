import useApi from '@/bcsc-theme/api/hooks/useApi'
import { ClientMetadata } from '@/bcsc-theme/api/hooks/useMetadataApi'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import { BCSCCardProcess } from '@/bcsc-theme/types/cards'
import { TOKENS, useServices } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { useEffect, useMemo } from 'react'
import { Alert } from 'react-native'

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
   * Filter service clients based on the user's card process
   *
   * @see card-utils.ts->getCardProcessForCardType
   * @example BCSCCardProcess.NonPhoto would filter out services that do not support non-photo cards
   * @type {BCSCCardProcess}
   */
  cardProcessFilter?: BCSCCardProcess
  /**
   * Filter service clients that require a BC Address on file
   *
   * @type {boolean}
   */
  requireBCAddressFilter?: boolean
}

/**
 * A custom hook to filter service clients based on various criteria such as name, card process, and BC address requirement.
 *
 * @param {ServiceClientsFilter} filter The filter criteria to apply to the service clients.
 * @returns {*} {ClientMetadata[]} The filtered list of service clients.
 */
export const useFilterServiceClients = (filter: ServiceClientsFilter): ClientMetadata[] => {
  const { metadata } = useApi()
  const navigation = useNavigation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const {
    data: serviceClients,
    load,
    isReady,
  } = useDataLoader<ClientMetadata[]>(() => metadata.getClientMetadata(), {
    onError: (error) => {
      logger.error('Error loading services', error as Error)
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
    if (!serviceClients) {
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

    // Sort services alphabetically by client_name
    return serviceClientsCopy.sort((a, b) => a.client_name.localeCompare(b.client_name))
  }, [serviceClients, filter.cardProcessFilter, filter.requireBCAddressFilter])

  // Further filter services based on the partial name filter
  const queriedServiceClients = useMemo(() => {
    // Return all supported services when there's no search text
    if (!filter.partialNameFilter || filter.partialNameFilter.trim() === '') {
      return filteredServiceClients
    }

    // Filter supported services based on the search text (case insensitive)
    const query = filter.partialNameFilter.toLowerCase()

    return filteredServiceClients.filter((service) => service.client_name.toLowerCase().includes(query))
  }, [filteredServiceClients, filter])

  return queriedServiceClients
}
