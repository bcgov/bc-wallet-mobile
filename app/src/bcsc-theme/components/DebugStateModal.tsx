import { BCState } from '@/store'
import Clipboard from '@react-native-clipboard/clipboard'
import React, { useState } from 'react'
import { Button, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { InputWithValidation } from './InputWithValidation'

/**
 * A modal component that displays the current state of the application in JSON format.
 * Used for debugging purposes, allowing developers to inspect the state and copy it to the clipboard.
 *
 * @param props - The props for the DebugStateModal component
 * @returns A React element representing the DebugStateModal component
 *
 */
export const DebugStateModal = (props: { state: BCState; open: boolean; onClose: () => void }) => {
  const safeAreaInsets = useSafeAreaInsets()
  const [searchTerm, setSearchTerm] = useState('')
  const [copied, setCopied] = useState(false)

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      marginTop: safeAreaInsets.top,
      marginBottom: safeAreaInsets.bottom,
      backgroundColor: '#aeaeae49',
    },
    modalControls: {
      display: 'flex',
      flexDirection: 'row',
      padding: 16,
    },
    searchInput: {
      flex: 1,
      paddingRight: 8,
    },
    jsonTextContainer: {
      padding: 16,
    },
    jsonText: {
      fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
      fontSize: 14,
    },
  })

  const filteredState = filterByTerm(props.state, searchTerm.trim().toLowerCase())

  const handleCopy = () => {
    Clipboard.setString(JSON.stringify(filteredState, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000) // Reset copied state after 2 seconds
  }

  return (
    <Modal visible={props.open} transparent={false} animationType="slide" onRequestClose={props.onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalControls}>
          <View style={styles.searchInput}>
            <InputWithValidation
              id={'json-property-search'}
              value={searchTerm}
              label={''}
              hideLabel={true}
              inputOverlay={true}
              onChangeText={(text) => setSearchTerm(text)}
            />
          </View>

          <Button onPress={handleCopy} title={copied ? 'Copied' : 'Copy'} />
          <Button onPress={props.onClose} title="Close" />
        </View>
        <ScrollView contentContainerStyle={styles.jsonTextContainer}>
          <Text selectable style={styles.jsonText}>
            {renderHighlightedJSON(filteredState)}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  )
}

/**
 * Renders a JSON object as a string with highlighted keys.
 * Keys are displayed in bold, while values remain in normal font weight.
 *
 * TODO (MD): Use full syntax highlighting
 *
 * @param data - The JSON object to render.
 * @returns An array of React elements representing the highlighted JSON.
 */
function renderHighlightedJSON(data: any) {
  const json = JSON.stringify(data, null, 2)
  const parts = json.split(/("(?:\\.|[^"\\])*"(?=\s*:))/g)

  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <Text key={i} style={{ fontWeight: 'bold' }}>
        {part}
      </Text>
    ) : (
      part
    )
  )
}

/**
 * Filters an object based on a search term. It checks both keys and values for matches.
 *
 * @param data - The object to filter.
 * @param term - The search term to filter by.
 * @returns A new object containing only the keys and values that match the search term.
 */
function filterByTerm(data: any, term: string): any {
  if (!term || typeof data !== 'object' || data === null) {
    return data
  }

  const result: any = Array.isArray(data) ? [] : {}

  for (const key of Object.keys(data)) {
    const value = data[key]

    if (key.toLowerCase().includes(term)) {
      result[key] = value // full subtree, no further filtering
      continue
    }

    if (typeof value !== 'object' || value === null) {
      if (String(value).toLowerCase().includes(term)) {
        result[key] = value
      }
      continue
    }

    const nested = filterByTerm(value, term)
    if (Object.keys(nested).length > 0) {
      result[key] = nested
    }
  }

  return result
}
