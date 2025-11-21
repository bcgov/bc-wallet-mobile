import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Animated, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { Directions, FlingGestureHandler, State } from 'react-native-gesture-handler'

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
  const slideAnim = useRef(new Animated.Value(0)).current
  const { width: screenWidth } = useWindowDimensions()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContainer: {
      flex: 1,
    },
    contentContainer: {
      gap: Spacing.md,
      padding: Spacing.md,
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
    carouselPagesContainer: {
      flexDirection: 'row',
      width: screenWidth * 3, // Width for all 3 pages
    },
    carouselPage: {
      width: screenWidth,
    },
  })

  const carouselPageData = [
    { key: 'access', headerKey: 'BCSC.Onboarding.CarouselServicesHeader' },
    { key: 'prove', headerKey: 'BCSC.Onboarding.CarouselProveHeader' },
    { key: 'cannot', headerKey: 'BCSC.Onboarding.CarouselCannotUseHeader' },
  ]

  const renderCarouselPage = (pageData: { key: string; headerKey: string }) => (
    <View key={pageData.key} style={[styles.contentContainer, styles.carouselPage]}>
      {/* TODO (md): replace with image */}
      <View style={{ height: 240, borderWidth: 5, borderStyle: 'dotted', borderColor: 'white' }} />
      <ThemedText variant={'headingThree'}>{t(pageData.headerKey)}</ThemedText>
      <ThemedText>{mockCarouselContent}</ThemedText>
    </View>
  )

  const carouselPages = carouselPageData.map((pageData) => ({
    key: pageData.key,
    content: renderCarouselPage(pageData),
  }))

  const animateToPage = (pageIndex: number) => {
    const toValue = -pageIndex * screenWidth
    Animated.timing(slideAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }

  const handleNext = () => {
    if (carouselIndex === carouselPages.length - 1) {
      navigation.navigate(BCSCScreens.OnboardingPrivacyPolicy)
      return
    }

    const nextIndex = carouselIndex + 1
    setCarouselIndex(nextIndex)
    animateToPage(nextIndex)
  }

  const handleBack = () => {
    if (carouselIndex > 0) {
      const prevIndex = carouselIndex - 1
      setCarouselIndex(prevIndex)
      animateToPage(prevIndex)
    }
  }

  return (
    <ScreenWrapper scrollable={false}>
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
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <Animated.View
                style={[
                  styles.carouselPagesContainer,
                  {
                    transform: [{ translateX: slideAnim }],
                  },
                ]}
              >
                {carouselPages.map((page) => (
                  <View key={page.key} style={styles.carouselPage}>
                    {page.content}
                  </View>
                ))}
              </Animated.View>
            </ScrollView>

            <View style={styles.carouselContainer}>
              <TouchableOpacity
                style={[styles.carouselActionButtonContainer, carouselIndex === 0 && { opacity: 0.5 }]}
                onPress={handleBack}
                testID={testIdWithKey('CarouselBack')}
                accessibilityRole="button"
                accessibilityLabel={t('BCSC.Onboarding.CarouselBack')}
                disabled={carouselIndex === 0}
              >
                <ThemedText style={styles.carouselActionButtonText}>{t('BCSC.Onboarding.CarouselBack')}</ThemedText>
              </TouchableOpacity>

              <View style={styles.carouselCirclesContainer}>
                {carouselPages.map((page, index) => (
                  <View
                    key={`carousel-circle-${page.key}`}
                    style={[styles.carouselCircle, carouselIndex >= index && styles.carouselCircleHighlighted]}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={styles.carouselActionButtonContainer}
                onPress={handleNext}
                testID={testIdWithKey('CarouselNext')}
                accessibilityRole="button"
                accessibilityLabel={t('BCSC.Onboarding.CarouselNext')}
              >
                <ThemedText style={styles.carouselActionButtonText}>{t('BCSC.Onboarding.CarouselNext')}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </FlingGestureHandler>
      </FlingGestureHandler>
    </ScreenWrapper>
  )
}
