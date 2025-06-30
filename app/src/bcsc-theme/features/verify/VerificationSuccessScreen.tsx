import { BCDispatchAction, BCState } from '@/store'
import { Button, ButtonType, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

const VerificationSuccessScreen = () => {
  const { ColorPallet, Spacing } = useTheme()
  const [, dispatch] = useStore<BCState>()

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
      marginTop: 'auto',
    },
  })

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <View style={styles.contentContainer}>
        <Icon name={'check'} size={108} color={ColorPallet.brand.primary} />
        <ThemedText
          variant={'headingThree'}
          style={{ marginTop: Spacing.md, textAlign: 'center' }}
        >{`You're all set`}</ThemedText>
        <ThemedText
          variant={'headingFour'}
          style={{ marginVertical: Spacing.lg, textAlign: 'center' }}
        >{`Use this app to securely log in to many different websites.`}</ThemedText>
        <ThemedText
          variant={'headingFour'}
          style={{ fontWeight: 'normal', textAlign: 'center' }}
        >{`Remember, it is not a health card, vaccine card, driver's license, or photo ID.`}</ThemedText>
      </View>
      <View style={styles.controlsContainer}>
        <Button
          testID={testIdWithKey('Ok')}
          accessibilityLabel={'Ok'}
          title={'Ok'}
          buttonType={ButtonType.Primary}
          onPress={() => dispatch({ type: BCDispatchAction.UPDATE_VERIFIED, payload: [true] })}
        />
      </View>
    </SafeAreaView>
  )
}
export default VerificationSuccessScreen
