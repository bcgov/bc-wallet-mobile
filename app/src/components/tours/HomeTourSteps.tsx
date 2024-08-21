import { useTheme, TourStep, TourBox, RenderProps } from '@hyperledger/aries-bifold-core'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Image, Text } from 'react-native'

import useTourImageDimensions from '../../hooks/tour-image-dimensions'

export const homeTourSteps: TourStep[] = [
  {
    Render: (props: RenderProps) => {
      const { currentTour, currentStep, next, stop, previous } = props
      const { t } = useTranslation()
      const { ColorPallet, TextTheme } = useTheme()
      const { imageWidth, imageHeight } = useTourImageDimensions()

      return (
        <TourBox
          title={t('Tour.AddAndShare')}
          leftText={t('Tour.Skip')}
          rightText={t('Tour.Next')}
          onLeft={stop}
          onRight={next}
          currentTour={currentTour}
          currentStep={currentStep}
          previous={previous}
          stop={stop}
          next={next}
          stepOn={1}
          stepsOutOf={3}
        >
          <Image
            source={require('../../assets/img/mobile-phone-scanning-laptop.jpg')}
            resizeMode={'contain'}
            resizeMethod={'resize'}
            style={{
              alignSelf: 'center',
              width: imageWidth,
              height: imageHeight,
            }}
          />
          <Text
            style={{
              ...TextTheme.normal,
              color: ColorPallet.notification.infoText,
            }}
            allowFontScaling={false}
          >
            {t('Tour.AddAndShareDescription')}
          </Text>
        </TourBox>
      )
    },
  },
  {
    Render: (props: RenderProps) => {
      const { currentTour, currentStep, next, stop, previous } = props
      const { t } = useTranslation()
      const { ColorPallet, TextTheme } = useTheme()
      const { imageWidth, imageHeight } = useTourImageDimensions()

      return (
        <TourBox
          title={t('Tour.Notifications')}
          leftText={t('Tour.Back')}
          rightText={t('Tour.Next')}
          onLeft={previous}
          onRight={next}
          currentTour={currentTour}
          currentStep={currentStep}
          next={next}
          stop={stop}
          previous={previous}
          stepOn={2}
          stepsOutOf={3}
        >
          <Image
            source={require('../../assets/img/notifications-screencap.png')}
            resizeMode={'contain'}
            resizeMethod={'resize'}
            style={{
              alignSelf: 'center',
              width: imageWidth,
              height: imageHeight,
            }}
          />
          <Text
            style={{
              ...TextTheme.normal,
              color: ColorPallet.notification.infoText,
            }}
            allowFontScaling={false}
          >
            {t('Tour.NotificationsDescription')}
          </Text>
        </TourBox>
      )
    },
  },
  {
    Render: (props: RenderProps) => {
      const { currentTour, currentStep, next, stop, previous } = props
      const { t } = useTranslation()
      const { ColorPallet, TextTheme } = useTheme()
      const { imageWidth, imageHeight } = useTourImageDimensions()

      return (
        <TourBox
          title={t('Tour.YourCredentials')}
          leftText={t('Tour.Back')}
          rightText={t('Tour.Done')}
          onLeft={previous}
          onRight={stop}
          currentTour={currentTour}
          currentStep={currentStep}
          next={next}
          stop={stop}
          previous={previous}
          stepOn={3}
          stepsOutOf={3}
        >
          <Image
            source={require('../../assets/img/list-of-credentials.jpg')}
            resizeMode={'contain'}
            resizeMethod={'resize'}
            style={{
              alignSelf: 'center',
              width: imageWidth,
              height: imageHeight,
            }}
          />
          <Text
            style={{
              ...TextTheme.normal,
              color: ColorPallet.notification.infoText,
            }}
            allowFontScaling={false}
          >
            {t('Tour.YourCredentialsDescription')}
          </Text>
        </TourBox>
      )
    },
  },
]
