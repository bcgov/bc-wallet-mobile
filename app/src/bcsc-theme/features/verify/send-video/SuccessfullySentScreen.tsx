import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

type SuccessfullySentScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.SuccessfullySent>
}

const SuccessfullySentScreen = ({ navigation }: SuccessfullySentScreenProps) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    contentContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.md,
    },
    controlsContainer: {
      marginTop: 'auto',
      padding: Spacing.md,
    },
  })

  const controls = (
    <Button
      testID={testIdWithKey(t('BCSC.SendVideo.SuccessfullySent.ButtonText'))}
      accessibilityLabel={t('BCSC.SendVideo.SuccessfullySent.ButtonText')}
      title={t('BCSC.SendVideo.SuccessfullySent.ButtonText')}
      buttonType={ButtonType.Primary}
      onPress={() =>
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: BCSCScreens.SetupSteps }],
          })
        )
      }
    />
  )
  return (
    <ScreenWrapper
      safeAreaViewStyle={styles.pageContainer}
      controls={controls}
      controlsContainerStyle={styles.controlsContainer}
      scrollViewProps={{ contentContainerStyle: styles.contentContainer }}
    >
      <StatusDetails
        title={t('BCSC.SendVideo.SuccessfullySent.Heading')}
        description={t('BCSC.SendVideo.SuccessfullySent.Description1')}
        bullets={[t('BCSC.SendVideo.SuccessfullySent.Bullet1'), t('BCSC.SendVideo.SuccessfullySent.Bullet2')]}
        extraText={t('BCSC.SendVideo.SuccessfullySent.Description3')}
      />
    </ScreenWrapper>
  )
}
export default SuccessfullySentScreen
