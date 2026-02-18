import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { Button, ButtonType, ScreenWrapper, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import TakeMediaButton from './components/TakeMediaButton'
import useEvidenceUploadModel from './useEvidenceUploadModel'

type InformationRequiredScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.InformationRequired>
}

const InformationRequiredScreen = ({ navigation }: InformationRequiredScreenProps) => {
  const { Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { t } = useTranslation()
  const { handleSend, isReady, isLoading } = useEvidenceUploadModel(navigation)

  const styles = StyleSheet.create({
    controlsContainer: {
      padding: Spacing.md,
    },
  })

  const controls = (
    <Button
      buttonType={ButtonType.Primary}
      title={t('BCSC.SendVideo.InformationRequired.ButtonText')}
      onPress={handleSend}
      testID={'SendToServiceBCNow'}
      accessibilityLabel={t('BCSC.SendVideo.InformationRequired.ButtonText')}
      disabled={!isReady || isLoading}
    />
  )

  return (
    <ScreenWrapper
      padded={false}
      edges={['bottom']}
      controls={controls}
      controlsContainerStyle={styles.controlsContainer}
    >
      <TakeMediaButton
        onPress={() => {
          navigation.navigate(BCSCScreens.PhotoInstructions, { forLiveCall: false })
        }}
        title={t('BCSC.SendVideo.InformationRequired.Heading1')}
        actionLabel={t('BCSC.SendVideo.InformationRequired.ActionLabel')}
        thumbnailUri={store.bcsc.photoPath && `file://${store.bcsc.photoPath}`}
        style={{ borderBottomWidth: 0 }}
      />
      <TakeMediaButton
        onPress={() => {
          navigation.navigate(BCSCScreens.VideoInstructions)
        }}
        title={t('BCSC.SendVideo.InformationRequired.Heading2')}
        actionLabel={t('BCSC.SendVideo.InformationRequired.ActionLabel2')}
        thumbnailUri={
          store.bcsc.videoPath && store.bcsc.videoThumbnailPath && `file://${store.bcsc.videoThumbnailPath}`
        }
      />
    </ScreenWrapper>
  )
}

export default InformationRequiredScreen
