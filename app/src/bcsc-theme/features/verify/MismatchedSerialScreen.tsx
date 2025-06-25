import { BCState } from '@/store'
import { ThemedText, useStore, useTheme } from '@bifold/core'
import { Image, StyleSheet, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import CardNotFoundImage from '@assets/img/card_not_found_highlight.png'

const CARD_NOT_FOUND_IMAGE = Image.resolveAssetSource(CardNotFoundImage).uri

const twoThirds = 0.67

const MismatchedSerialScreen = () => {
  const { ColorPallet, Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { width } = useWindowDimensions()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      backgroundColor: ColorPallet.brand.primaryBackground,
      padding: Spacing.md,
    },
    image: {
      width: width - Spacing.md * 2,
      height: (width - Spacing.md * 2) * twoThirds,
      marginBottom: Spacing.lg,
    },
  })

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.sm }}>Card not found</ThemedText>
      <ThemedText style={{ marginBottom: Spacing.lg }}>
        Check the card serial number and birthdate match what is on your card:
      </ThemedText>
      <ThemedText variant={'bold'}>Serial number: {store.bcsc.serial}</ThemedText>
      <ThemedText variant={'bold'} style={{ marginBottom: Spacing.lg }}>
        Birthdate: {store.bcsc.birthdate?.toLocaleString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
      </ThemedText>
      <ThemedText style={{ marginBottom: Spacing.lg }}>
        Check your card is a BC Services Card by looking at the front of your card:
      </ThemedText>
      <Image style={styles.image} source={{ uri: CARD_NOT_FOUND_IMAGE }} resizeMode={'contain'} />
    </SafeAreaView>
  )
}
export default MismatchedSerialScreen
