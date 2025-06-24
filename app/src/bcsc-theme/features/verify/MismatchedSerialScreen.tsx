import { ThemedText, useStore, useTheme } from '@bifold/core'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BCState } from '@/store'

const MismatchedSerialScreen = () => {
  const { ColorPallet, Spacing } = useTheme()
  const [store] = useStore<BCState>()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      backgroundColor: ColorPallet.brand.primaryBackground,
      padding: Spacing.md,
    },
  })

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <ThemedText variant={'headingThree'}>Card not found</ThemedText>
      <ThemedText style={{ marginBottom: Spacing.md }}>Check the card serial number and birthdate match what is on your card:</ThemedText>
      <ThemedText variant={'bold'}>Serial number: {store.bcsc.serial}</ThemedText>
      <ThemedText variant={'bold'} style={{ marginBottom: Spacing.md }}>Birthdate: {store.bcsc.birthdate?.toLocaleString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}</ThemedText>
      <ThemedText style={{ marginBottom: Spacing.lg }}>Check your card is a BC Services Card by looking at the front of your card:</ThemedText>
    </SafeAreaView>
  )
}
export default MismatchedSerialScreen