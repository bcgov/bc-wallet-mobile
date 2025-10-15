import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'

const NUM_CAROUSEL_ITEMS = 3

const mockCarouselContent =
  'Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus.'

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
export const IntroCarouselScreen = (): JSX.Element => {
  const { t } = useTranslation()
  const theme = useTheme()
  const navigation = useNavigation<StackNavigationProp<BCSCOnboardingStackParams>>()
  const [carouselIndex, setCarouselIndex] = useState(0)

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

  const handleNext = () => {
    if (carouselIndex === NUM_CAROUSEL_ITEMS - 1) {
      navigation.navigate(BCSCScreens.OnboardingPrivacyPolicyScreen)
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
        <ScrollView>
          {carouselIndex === 0 && (
            <View style={styles.contentContainer}>
              {/* TODO: replace with image*/}
              <View style={{ height: 240, borderWidth: 5, borderStyle: 'dotted', borderColor: 'white' }} />
              <ThemedText variant={'headingThree'}>{t('Unified.Onboarding.CarouselServicesHeader')}</ThemedText>
              <ThemedText>{mockCarouselContent}</ThemedText>
            </View>
          )}

          {carouselIndex === 1 && (
            <View style={styles.contentContainer}>
              {/* TODO: replace with image */}
              <View style={{ height: 240, borderWidth: 5, borderStyle: 'dotted', borderColor: 'white' }} />
              <ThemedText variant={'headingThree'}>{t('Unified.Onboarding.CarouselProveHeader')}</ThemedText>
              <ThemedText>{mockCarouselContent}</ThemedText>
            </View>
          )}

          {carouselIndex === 2 && (
            <View style={styles.contentContainer}>
              {/* TODO: replace with image*/}
              <View style={{ height: 240, borderWidth: 5, borderStyle: 'dotted', borderColor: 'white' }} />
              <ThemedText variant={'headingThree'}>{t('Unified.Onboarding.CarouselCannotUseHeader')}</ThemedText>
              <ThemedText>{mockCarouselContent}</ThemedText>
            </View>
          )}
        </ScrollView>

        <View style={styles.carouselContainer}>
          <TouchableOpacity
            style={styles.carouselActionButtonContainer}
            onPress={handleBack}
            testID={testIdWithKey('CarouselBack')}
            accessibilityRole="button"
            accessibilityLabel={t('Unified.Onboarding.CarouselBack')}
            // QUESTION (MD): Should we update the styling to indicate it's disabled?
            disabled={carouselIndex === 0}
          >
            <ThemedText style={styles.carouselActionButtonText}>{t('Unified.Onboarding.CarouselBack')}</ThemedText>
          </TouchableOpacity>

          <View style={styles.carouselCirclesContainer}>
            <View style={[styles.carouselCircle, carouselIndex === 0 && styles.carouselCircleHighlighted]} />
            <View style={[styles.carouselCircle, carouselIndex === 1 && styles.carouselCircleHighlighted]} />
            <View style={[styles.carouselCircle, carouselIndex === 2 && styles.carouselCircleHighlighted]} />
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
