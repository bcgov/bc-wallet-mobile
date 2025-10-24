import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { Directions, FlingGestureHandler, State } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

// TODO (MD): Waiting on final content, replace mock content with real carousel text
const mockCarouselContent =
  'Lorem ipsum dolor sit amet consectetur adipiscing elit quisque faucibus ex sapien vitae pellentesque sem placerat in id cursus mi pretium tellus duis convallis tempus.'

interface IntroCarouselScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingIntroCarousel>
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
export const IntroCarouselScreen = ({ navigation }: IntroCarouselScreenProps): JSX.Element => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const [carouselIndex, setCarouselIndex] = useState(0)

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContainer: {
      flex: 1,
      padding: Spacing.md,
    },
    contentContainer: {
      gap: Spacing.md,
    },
    carouselContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    carouselCirclesContainer: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: Spacing.lg,
    },
    carouselCircle: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: ColorPalette.brand.secondary,
    },
    carouselCircleHighlighted: {
      backgroundColor: ColorPalette.brand.primary,
    },
    carouselActionButtonContainer: {
      padding: Spacing.md,
    },
    carouselActionButtonText: {
      fontWeight: 'bold',
      color: ColorPalette.brand.buttonText,
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
      navigation.navigate(BCSCScreens.PrivacyPolicy, { nonInteractive: false })
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
      <FlingGestureHandler
        direction={Directions.LEFT}
        onHandlerStateChange={(event) => {
          if (event.nativeEvent.state === State.ACTIVE) {
            handleNext()
          }
        }}
      >
        <FlingGestureHandler
          direction={Directions.RIGHT}
          onHandlerStateChange={(event) => {
            if (event.nativeEvent.state === State.ACTIVE) {
              handleBack()
            }
          }}
        >
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
        </FlingGestureHandler>
      </FlingGestureHandler>
    </SafeAreaView>
  )
}
