import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import FirstTutorial from '@assets/img/FirstTutorial.jpg'
import SecondTutorial from '@assets/img/SecondTutorial.jpg'
import ThirdTutorial from '@assets/img/ThirdTutorial.jpg'
import { ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Animated,
  Image,
  ImageSourcePropType,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import { Directions, FlingGestureHandler, State } from 'react-native-gesture-handler'

interface IntroCarouselScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingIntroCarousel>
}

type CarouselPageData = {
  key: string
  headerContent: string
  bodyContentA: string
  bodyContentB?: string
  image: ImageSourcePropType
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
    carouselImageContainer: {
      alignItems: 'center',
    },
    carouselImage: {
      width: screenWidth,
      height: 300,
      resizeMode: 'contain',
    },
  })

  const carouselPageData: CarouselPageData[] = [
    {
      key: 'access',
      headerContent: 'BCSC.Onboarding.CarouselServicesHeader',
      bodyContentA: 'BCSC.Onboarding.CarouselServicesContent',
      image: FirstTutorial,
    },
    {
      key: 'prove',
      headerContent: 'BCSC.Onboarding.CarouselProveHeader',
      bodyContentA: 'BCSC.Onboarding.CarouselProveBodyContentA',
      bodyContentB: 'BCSC.Onboarding.CarouselProveBodyContentB',
      image: SecondTutorial,
    },
    {
      key: 'cannot',
      headerContent: 'BCSC.Onboarding.CarouselCannotUseHeader',
      bodyContentA: 'BCSC.Onboarding.CarouselCannotUseBodyContentA',
      bodyContentB: 'BCSC.Onboarding.CarouselCannotUseBodyContentB',
      image: ThirdTutorial,
    },
  ]

  const renderCarouselPage = (pageData: CarouselPageData) => (
    <View key={pageData.key} style={[styles.contentContainer, styles.carouselPage]}>
      <View style={styles.carouselImageContainer}>
        <Image source={pageData.image} style={styles.carouselImage} />
      </View>
      <ThemedText variant={'headingThree'}>{t(pageData.headerContent)}</ThemedText>
      <ThemedText>{t(pageData.bodyContentA)}</ThemedText>
      {pageData.bodyContentB ? <ThemedText>{t(pageData.bodyContentB)}</ThemedText> : null}
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
    <ScreenWrapper padded={false} scrollable={false} edges={['top', 'bottom', 'left', 'right']}>
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
                    style={[styles.carouselCircle, carouselIndex == index && styles.carouselCircleHighlighted]}
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
