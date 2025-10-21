import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useWorkflowEngine } from '@/contexts/WorkflowEngineContext'
import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// TODO (MD): Waiting on final content, replace mock content with real carousel text
const mockCarouselContent =
  'Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus.'

interface IntroCarouselScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingIntroCarouselScreen>
}

/**
 * Intro Carousel screen component that displays a series of informational slides to the user.
 *
 * Page content includes:
 *   - Which services you can access online
 *   - Info on proving your identity online
 *   - What you can't use this app for
 *
 * @returns {*} {JSX.Element} The IntroCarouselScreen component.
 */
export const IntroCarouselScreen = (props: IntroCarouselScreenProps): JSX.Element => {
  const { t } = useTranslation()
  const theme = useTheme()
  const [carouselIndex, setCarouselIndex] = useState(0)
  const workflowEngine = useWorkflowEngine()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContainer: {
      flex: 1,
      padding: theme.Spacing.md,
    },
    contentContainer: {
      gap: theme.Spacing.md,
    },
    carouselContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    carouselCirclesContainer: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.Spacing.lg,
    },
    carouselCircle: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.ColorPalette.brand.secondary,
    },
    carouselCircleHighlighted: {
      backgroundColor: theme.ColorPalette.brand.primary,
    },
    carouselActionButtonContainer: {
      padding: theme.Spacing.md,
    },
    carouselActionButtonText: {
      fontWeight: 'bold',
      color: theme.ColorPalette.brand.buttonText,
    },
  })

  const carouselPages = [
    <View key="services" style={styles.contentContainer}>
      {/* TODO: replace with image */}
      <View style={{ height: 240, borderWidth: 5, borderStyle: 'dotted', borderColor: 'white' }} />
      <ThemedText variant={'headingThree'}>{t('Unified.Onboarding.CarouselServicesHeader')}</ThemedText>
      <ThemedText>{mockCarouselContent}</ThemedText>
    </View>,
    <View key="prove" style={styles.contentContainer}>
      {/* TODO: replace with image */}
      <View style={{ height: 240, borderWidth: 5, borderStyle: 'dotted', borderColor: 'white' }} />
      <ThemedText variant={'headingThree'}>{t('Unified.Onboarding.CarouselProveHeader')}</ThemedText>
      <ThemedText>{mockCarouselContent}</ThemedText>
    </View>,
    <View key="use" style={styles.contentContainer}>
      {/* TODO: replace with image */}
      <View style={{ height: 240, borderWidth: 5, borderStyle: 'dotted', borderColor: 'white' }} />
      <ThemedText variant={'headingThree'}>{t('Unified.Onboarding.CarouselCannotUseHeader')}</ThemedText>
      <ThemedText>{mockCarouselContent}</ThemedText>
    </View>,
  ]

  const handleNext = () => {
    if (carouselIndex === carouselPages.length - 1) {
      workflowEngine.nextStep()
      return
    }

    setCarouselIndex(carouselIndex + 1)
  }

  const handleBack = () => {
    if (carouselIndex > 0) {
      setCarouselIndex(carouselIndex - 1)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.scrollContainer}>
        <ScrollView>{carouselPages[carouselIndex]}</ScrollView>

        <View style={styles.carouselContainer}>
          <TouchableOpacity
            style={[styles.carouselActionButtonContainer, carouselIndex === 0 && { opacity: 0.5 }]}
            onPress={handleBack}
            testID={testIdWithKey('CarouselBack')}
            accessibilityRole="button"
            accessibilityLabel={t('Unified.Onboarding.CarouselBack')}
            disabled={carouselIndex === 0}
          >
            <ThemedText style={styles.carouselActionButtonText}>{t('Unified.Onboarding.CarouselBack')}</ThemedText>
          </TouchableOpacity>

          <View style={styles.carouselCirclesContainer}>
            {carouselPages.map((element, index) => (
              <View
                key={`carousel-circle-${element.key}`}
                style={[styles.carouselCircle, carouselIndex === index && styles.carouselCircleHighlighted]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={styles.carouselActionButtonContainer}
            onPress={handleNext}
            testID={testIdWithKey('CarouselNext')}
            accessibilityRole="button"
            accessibilityLabel={t('Unified.Onboarding.CarouselNext')}
          >
            <ThemedText style={styles.carouselActionButtonText}>{t('Unified.Onboarding.CarouselNext')}</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}
