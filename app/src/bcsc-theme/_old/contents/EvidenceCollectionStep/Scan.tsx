import { useTheme } from '@bifold/core'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type ScanContentProps = {
  goToBirthdate: () => void
}

const ScanContent: React.FC<ScanContentProps> = () => {
  const { ColorPallet, TextTheme } = useTheme()

  const styles = StyleSheet.create({
    pageContainer: {
      height: '100%',
      justifyContent: 'space-between',
      backgroundColor: ColorPallet.brand.secondaryBackground,
    },
    scrollView: {
      flex: 1,
      padding: 24,
    },
  })

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <Text style={TextTheme.headingThree}>Coming soon!</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

export default ScanContent
