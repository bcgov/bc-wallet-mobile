import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type SuccessfullySentScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.SuccessfullySent>
}

const SuccessfullySentScreen = ({ navigation }: SuccessfullySentScreenProps) => {
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
    <SafeAreaView style={styles.pageContainer}>
      <View style={styles.contentContainer}>
        <Icon name={'check'} size={108} color={ColorPallet.brand.primary} style={{ alignSelf: 'center' }} />
        <ThemedText
          variant={'headingThree'}
          style={{ marginTop: Spacing.lg }}
        >{`We've received your request to verify your identity.`}</ThemedText>
        <ThemedText style={{ marginVertical: Spacing.md }}>{`We review requests:`}</ThemedText>
        <View style={styles.bulletContainer}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>Monday to Friday, 9am to 5pm</ThemedText>
        </View>
        <View style={styles.bulletContainer}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>In the order they&apos;re received</ThemedText>
        </View>
        <ThemedText style={{ marginBottom: Spacing.md }}>Usually, we review requests within 24 hours.</ThemedText>
        <ThemedText>
          You&apos;ll get an email after we review your request. You can also check the status in this app.
        </ThemedText>
      </View>
      <View style={styles.controlsContainer}>
        <Button
          testID={testIdWithKey('Ok')}
          accessibilityLabel={'Ok'}
          title={'Ok'}
          buttonType={ButtonType.Primary}
          onPress={() =>
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: BCSCScreens.SetupSteps }],
              }),
            )
          }
        />
      </View>
    </SafeAreaView>
  )
}
export default SuccessfullySentScreen
