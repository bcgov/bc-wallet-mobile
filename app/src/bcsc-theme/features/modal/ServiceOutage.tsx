import { CardButton } from '@/bcsc-theme/components/CardButton'
import usePreventGestureBack from '@/hooks/usePreventGestureBack'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'
import useServiceOutageViewModel from './useServiceOutageViewModel'

export const ServiceOutage = (): React.ReactElement => {
  const { headerText, contentText, learnMoreText, buttonText, isCheckDisabled, handleCheckAgain, handleLearnMore } =
    useServiceOutageViewModel()
  const { Spacing, ColorPalette } = useTheme()

  usePreventGestureBack()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.modalPrimaryBackground,
    },
    scrollContainer: {},
    icon: {
      paddingVertical: Spacing.lg,
      alignSelf: 'center',
    },
    buttonContainer: {
      padding: Spacing.md,
    },
    textContent: {
      lineHeight: 30,
    },
    textContainer: {
      padding: Spacing.md,
      gap: Spacing.lg,
    },
  })

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Icon name="error-outline" size={200} color={ColorPalette.brand.icon} style={styles.icon} />
        <View style={styles.textContainer}>
          <ThemedText variant="headingThree">{headerText}</ThemedText>
          {contentText.filter(Boolean).map((text) => (
            <ThemedText key={text} style={styles.textContent}>
              {text}
            </ThemedText>
          ))}
          <CardButton
            title={learnMoreText}
            onPress={handleLearnMore}
            endIcon="open-in-new"
            testID={testIdWithKey('ServiceOutageHelpCentre')}
          />
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title={buttonText}
          buttonType={ButtonType.Primary}
          onPress={handleCheckAgain}
          disabled={isCheckDisabled}
          accessibilityLabel={buttonText}
          testID={testIdWithKey('ServiceOutageCheckAgain')}
        />
      </View>
    </SafeAreaView>
  )
}
