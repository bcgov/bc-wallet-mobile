import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { ThemedText, useTheme } from '@bifold/core'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import VerifyMethodActionButton from './components/VerifyMethodActionButton'

type VerificationMethodSelectionScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.VerificationMethodSelection>
}

const VerificationMethodSelectionScreen = ({ navigation }: VerificationMethodSelectionScreenProps) => {
  const { ColorPallet, Spacing } = useTheme()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
  })

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <VerifyMethodActionButton
        title={'Send a video'}
        description={`Record a short video and we'll review it to verify your identity.`}
        icon={'repeat'}
        onPress={() => null}
        style={{ marginBottom: Spacing.xl}}
      />
      <ThemedText variant={'bold'} style={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm }}>Cannot send a video?</ThemedText>
      <VerifyMethodActionButton
        title={'Video call'}
        description={`We will verify your identity during a video call.`}
        icon={'video'}
        onPress={() => null}
        style={{ borderBottomWidth: 0 }}
      />
      <VerifyMethodActionButton
        title={'In person'}
        description={`Find out where to go and what to bring.`}
        icon={'account'}
        onPress={() => navigation.navigate(BCSCScreens.VerifyInPerson)}
      />
    </SafeAreaView>
  )
}
export default VerificationMethodSelectionScreen