import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type PendingReviewScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.PendingReview>
}

const PendingReviewScreen = ({ navigation }: PendingReviewScreenProps) => {
  const { ColorPallet, Spacing } = useTheme()

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
    bulletContainer: {
      flexDirection: 'row',
      marginBottom: Spacing.md,
    },
    bullet: {
      marginRight: Spacing.xs,
    },
    controlsContainer: {
      marginTop: 'auto',
    },
  })

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <View style={styles.contentContainer}>
        <ThemedText variant={'headingThree'}>{`Request pending review`}</ThemedText>
        <ThemedText style={{ marginVertical: Spacing.md }}>{`We review requests:`}</ThemedText>
        <View style={styles.bulletContainer}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>Monday to Friday, 9am to 5pm</ThemedText>
        </View>
        <View style={styles.bulletContainer}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>In the order they&apos;re received</ThemedText>
        </View>
        <ThemedText style={{ marginBottom: Spacing.md }}>
          Usually, we review requests within 2 business days. During busy periods, it may take longer.
        </ThemedText>
        <ThemedText style={{ marginBottom: Spacing.md }}>
          After it&apos;s reviewed, you will get an email if your provided your email.
        </ThemedText>
        <ThemedText>Do not resend your video. If you do, your request will go to the back of the queue.</ThemedText>
      </View>
      <View style={styles.controlsContainer}>
        <Button
          testID={testIdWithKey('Ok')}
          accessibilityLabel={'Ok'}
          title={'Ok'}
          buttonType={ButtonType.Primary}
          onPress={() => navigation.goBack()}
        />
      </View>
    </SafeAreaView>
  )
}
export default PendingReviewScreen
