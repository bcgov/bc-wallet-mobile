import { useTheme, TourStep, TourBox } from '@hyperledger/aries-bifold-core'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Image, Text } from 'react-native'

import useTourImageDimensions from '../../hooks/tour-image-dimensions'

export const credentialsTourSteps: TourStep[] = [
  {
    render: (props) => {
      const { currentTour, currentStep, next, stop, previous } = props
      const { t } = useTranslation()
      const { ColorPallet, TextTheme } = useTheme()
      const { imageWidth, imageHeight } = useTourImageDimensions()

      return (
        <TourBox
          title={t('Tour.AddCredentials')}
          hideLeft
          rightText={t('Tour.Done')}
          onRight={stop}
          currentTour={currentTour}
          currentStep={currentStep}
          previous={previous}
          stop={stop}
          next={next}
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
            {t('Tour.AddCredentialsDescription')}
          </Text>
        </TourBox>
      )
    },
  },
]
