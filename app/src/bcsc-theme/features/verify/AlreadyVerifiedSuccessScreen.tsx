import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { TestIds } from '@/test-ids/registry'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, useTheme } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

type AlreadyVerifiedSuccessScreenProps = StackScreenProps<BCSCMainStackParams>

/**
 * AlreadyVerifiedSuccessScreen is a component that renders a screen indicating that the user has already been verified.
 * It displays a success message and provides a button to continue. Used in the QR code scanning flow.
 * @returns A React element that renders the already verified success screen.
 */
const AlreadyVerifiedSuccessScreen = ({ navigation }: AlreadyVerifiedSuccessScreenProps) => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    contentContainer: {
      // flexGrow lets the ScrollView content fill the viewport so justifyContent can actually
      // center it vertically (without it the content stays top-aligned and looks top-heavy).
      // flexGrow: 1,
      alignItems: 'center',
      padding: Spacing.lg,
      paddingTop: Spacing.xxl,
      gap: Spacing.lg,
    },
  })

  const controls = (
    <ControlContainer>
      <Button
        testID={testIdWithKey(TestIds.verify.verificationSuccess.continue)}
        accessibilityLabel={t('BCSC.AlreadyVerified.ButtonText')}
        title={t('BCSC.AlreadyVerified.ButtonText')}
        buttonType={ButtonType.Primary}
        onPress={() => {
          navigation.navigate(BCSCStacks.Tab, { screen: BCSCScreens.Home })
        }}
      ></Button>
    </ControlContainer>
  )
  return (
    <ScreenWrapper
      padded={false}
      controls={controls}
      edges={['top', 'bottom', 'left', 'right']}
      scrollViewContainerStyle={styles.contentContainer}
    >
      <StatusDetails
        iconColor="#7AB8F9"
        iconSize={150}
        title={t('BCSC.AlreadyVerified.Title')}
        description={t('BCSC.AlreadyVerified.Description')}
        description2={t('BCSC.AlreadyVerified.ExtraText')}
      />
    </ScreenWrapper>
  )
}
export default AlreadyVerifiedSuccessScreen
