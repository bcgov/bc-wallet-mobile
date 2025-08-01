import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCDispatchAction, BCState } from '@/store'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@bcsc-theme/types/navigators'
import { ThemedText, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useState } from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import VerifyMethodActionButton from './components/VerifyMethodActionButton'

type VerificationMethodSelectionScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.VerificationMethodSelection>
}

const VerificationMethodSelectionScreen = ({ navigation }: VerificationMethodSelectionScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const [, dispatch] = useStore<BCState>()
  const [loading, setLoading] = useState(false)
  const { evidence } = useApi()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
  })

  const handlePressSendVideo = async () => {
    try {
      setLoading(true)
      const { sha256, id, prompts } = await evidence.createVerificationRequest()
      dispatch({ type: BCDispatchAction.UPDATE_VERIFICATION_REQUEST, payload: [{ sha256, id }] })
      dispatch({ type: BCDispatchAction.UPDATE_VIDEO_PROMPTS, payload: [prompts] })
      navigation.navigate(BCSCScreens.InformationRequired)
    } catch (error) {
      // TODO: Handle error, e.g., show an alert or log the error
      return
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <VerifyMethodActionButton
        title={'Send a video'}
        description={`Record a short video and we'll review it to verify your identity.`}
        icon={'send'}
        onPress={handlePressSendVideo}
        style={{ marginBottom: Spacing.xxl }}
        loading={loading}
        disabled={loading}
      />
      <ThemedText
        variant={'bold'}
        style={{ marginTop: Spacing.xl, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm }}
      >
        Cannot send a video?
      </ThemedText>
      <VerifyMethodActionButton
        title={'Video call'}
        description={`We will verify your identity during a video call.`}
        icon={'video'}
        onPress={() => null}
        style={{ borderBottomWidth: 0 }}
        disabled={loading}
      />
      <VerifyMethodActionButton
        title={'In person'}
        description={`Find out where to go and what to bring.`}
        icon={'account'}
        onPress={() => navigation.navigate(BCSCScreens.VerifyInPerson)}
        disabled={loading}
      />
    </SafeAreaView>
  )
}
export default VerificationMethodSelectionScreen
