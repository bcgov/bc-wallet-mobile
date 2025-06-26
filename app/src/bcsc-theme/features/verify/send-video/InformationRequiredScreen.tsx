import { Image, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import TakeMediaButton from './components/TakeMediaButton'
import { Button, ButtonType, useAnimatedComponents, useTheme } from '@bifold/core'
import { useMemo, useState } from 'react'
// import { StackNavigationProp } from '@react-navigation/stack'
// import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import ComboCardImage from '@assets/img/combo_card.png'

const COMBO_CARD = Image.resolveAssetSource(ComboCardImage).uri

// type InformationRequiredScreenProps = {
//   navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.InformationRequired>
// }

const InformationRequiredScreen = () => {
  const { Spacing } = useTheme()
  const [loading] = useState(false)
  const uploadedBoth = useMemo(() => true, [])
  const { ButtonLoading } = useAnimatedComponents()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'space-between',
    },
    // no properties needed, just a helpful label for the View
    mediaContainer: {},

    controlsContainer: {
      padding: Spacing.md,
    },
  })

  const onPressSend = () => {}

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.mediaContainer}>
        <TakeMediaButton
          onPress={() => {}}
          title={'Photo of your face'}
          actionLabel={'Take Photo'}
          thumbnailUri={COMBO_CARD}
          style={{ borderBottomWidth: 0 }}
        />
        <TakeMediaButton
          onPress={() => {}}
          title={'Video of your face'}
          actionLabel={'Record Video'}
          thumbnailUri={undefined}
        />
      </View>
      <View style={styles.controlsContainer}>
        <Button
          buttonType={ButtonType.Primary}
          title={'Send to Service BC Now'}
          onPress={onPressSend}
          testID={'SendToServiceBCNow'}
          accessibilityLabel={'Send to Service BC Now'}
          disabled={!uploadedBoth || loading}
        >
          {loading && <ButtonLoading />}
        </Button>
      </View>
    </SafeAreaView>
  )
}

export default InformationRequiredScreen
