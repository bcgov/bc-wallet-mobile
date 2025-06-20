import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { BulletPoint, Button, ButtonType, Link, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BCState } from '@/store'

type VerifyInPersonScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.VerifyInPerson>
}

const VerifyInPersonScreen = ({ navigation }: VerifyInPersonScreenProps) => {
  const { ColorPallet, Spacing, TextTheme } = useTheme()
  const [store] = useStore<BCState>()
  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPallet.brand.primaryBackground,
      padding: Spacing.md,
    },
    contentContainer: {
      flex: 1,
    },
    controlsContainer: {
      marginTop: 'auto'
    },
  })

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <View style={styles.contentContainer}>
        <ThemedText variant={'headingTwo'} style={{ marginBottom: Spacing.md }}>Verify in person</ThemedText>
        <ThemedText variant={'bold'}>Where to go</ThemedText>
        <Link
          linkText={'A Service BC Location'}
          testID={testIdWithKey('ServiceBCLink')}
          onPress={() => null}
          style={{ marginBottom: Spacing.md }}
        />
        <ThemedText variant={'bold'}>What to bring</ThemedText>
        <ThemedText>
          {'\u2022 This device'}
        </ThemedText>
        <ThemedText style={{ marginBottom: Spacing.lg }}>
          {`\u2022 Your BC Services Card - if it's a non-photo card, bring your additional ID too`}
        </ThemedText>
        <ThemedText variant={'bold'}>Show this confirmation number</ThemedText>
        <ThemedText variant={'headingThree'} style={{ fontWeight: 'normal', marginBottom: Spacing.xl }}>
          {`${store.bcsc.userCode?.slice(0, 4)}-${store.bcsc.userCode?.slice(4, 8)}`}
        </ThemedText>
        <ThemedText variant={'bold'}>You must complete this by</ThemedText>
        <ThemedText variant={'headingThree'} style={{ fontWeight: 'normal' }}>
          {store.bcsc.deviceCodeExpiresAt?.toLocaleString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
        </ThemedText>
      </View>
      <View style={styles.controlsContainer}>
        <View style={{ marginBottom: Spacing.md }}>
          <Button
            buttonType={ButtonType.Primary}
            testID={testIdWithKey('Back')}
            accessibilityLabel={'Back'}
            title={'Back'}
            onPress={() => navigation.navigate(BCSCScreens.VerificationSuccess)}
          />
        </View>
        <ThemedText variant={'labelSubtitle'} style={{ textAlign: 'center' }}>Card serial number: {store.bcsc.serial}</ThemedText>
      </View>  
    </SafeAreaView>
  )
}
export default VerifyInPersonScreen