import { runSystemChecks } from '@/services/system-checks/system-checks'
import { useEffect, useState } from 'react'
import { Modal, StyleSheet } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { InternetStatusSystemCheck } from '@/services/system-checks/InternetStatusSystemCheck'
import { ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import { SafeAreaView } from 'react-native-safe-area-context'

interface GlobalAlert {
  id: string
  title: string
  message: string
  buttonText: string
  onButtonPress: () => void
}

export const GlobalAlert = () => {
  const { Spacing } = useTheme()
  const [showModal, setShowModal] = useState(false)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      margin: Spacing.lg,
    },
  })

  useEffect(() => {
    // Internet connectivity listener
    const removeInternetListener = NetInfo.addEventListener(async (netInfo) => {
      await runSystemChecks([new InternetStatusSystemCheck(netInfo, setShowModal, logger)])
    })

    return () => {
      removeInternetListener()
    }
  }, [logger])

  return (
    <SafeAreaView style={styles.centeredView}>
      <Modal visible={!showModal} style={styles.modalContainer} transparent={true} animationType="fade">
        <ThemedText>No internet</ThemedText>
      </Modal>
    </SafeAreaView>
  )
}
