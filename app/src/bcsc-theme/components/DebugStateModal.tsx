import { BCState } from '@/store'
import React from 'react'
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export const DebugStateModal = (props: { state: BCState; open: boolean; onClose: () => void }) => {
  const safeAreaInsets = useSafeAreaInsets()

  const styles = StyleSheet.create({
    modalContainer: {
      marginTop: safeAreaInsets.top,
      marginBottom: safeAreaInsets.bottom,
      flex: 1,
    },
    modalControls: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      padding: 16,
    },
    jsonTextContainer: {
      padding: 16,
    },
    jsonText: {
      fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
      fontSize: 14,
    },
  })

  // Function to sort keys of an object based on a priority order
  // ie: ['bcsc', 'bcscSecure'] will be sorted first, then the rest of the keys in alphabetical order
  const sortKeysWithPriority = (obj: any, priorityOrder: string[]) => {
    const keys = Object.keys(obj)
    const sorted = [
      ...priorityOrder.filter((k) => keys.includes(k)),
      ...keys.filter((k) => !priorityOrder.includes(k)).sort(),
    ]
    const result: any = {}
    sorted.forEach((k) => {
      result[k] = obj[k]
    })
    return result
  }

  // Function to render JSON with highlighted keys
  const renderHighlightedJSON = (data: any) => {
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

  return (
    <Modal visible={props.open} transparent={false} animationType="slide" onRequestClose={props.onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalControls}>
          <Pressable onPress={props.onClose} accessible={false}>
            <Text>Close</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.jsonTextContainer}>
          <Text selectable style={styles.jsonText}>
            {renderHighlightedJSON(sortKeysWithPriority(props.state, ['bcsc', 'bcscSecure']))}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  )
}
