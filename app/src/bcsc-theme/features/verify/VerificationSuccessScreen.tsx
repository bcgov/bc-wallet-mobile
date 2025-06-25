import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { Button, ButtonType, Stacks, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { CommonActions } from '@react-navigation/native'

type VerificationSuccessScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.VerificationSuccess>
}

const VerificationSuccessScreen = ({ navigation }: VerificationSuccessScreenProps) => {
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
      justifyContent: 'center',
      alignItems: 'center',
    },
    controlsContainer: {
      marginTop: 'auto'
    },
  })

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <View style={styles.contentContainer}>
        <Icon name={'check'} size={108} color={ColorPallet.brand.primary} />
        <ThemedText variant={'headingThree'} style={{ marginTop: Spacing.md, textAlign: 'center' }}>{`You're all set`}</ThemedText>
        <ThemedText variant={'headingFour'} style={{ marginVertical: Spacing.lg, textAlign: 'center' }}>{`Use this app to securely log in to many different websites.`}</ThemedText>
        <ThemedText variant={'headingFour'} style={{ fontWeight: 'normal', textAlign: 'center' }}>{`Remember, it is not a health card, vaccine card, driver's license, or photo ID.`}</ThemedText>
      </View>
      <View style={styles.controlsContainer}>
        <Button
          testID={testIdWithKey('Ok')}
          accessibilityLabel={'Ok'}
          title={'Ok'}
          buttonType={ButtonType.Primary}
          onPress={() => navigation.getParent()?.dispatch(CommonActions.reset({ index: 0, routes: [{ name: Stacks.TabStack }] }))}
        />
      </View>
    </SafeAreaView>
  )
}
export default VerificationSuccessScreen