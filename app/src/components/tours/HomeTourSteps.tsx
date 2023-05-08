import { useTheme, TourStep, TourBox } from 'aries-bifold'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Image, Text, Dimensions } from 'react-native'

const { width: windowWidth } = Dimensions.get('window')
const totalHorizontalImagePadding = 90
const imageWidth = Math.floor(windowWidth - totalHorizontalImagePadding)
const imageHeight = Math.floor(imageWidth * 0.66)

export const homeTourSteps: TourStep[] = [
  {
    render: (props) => {
      const { current, next, stop, previous } = props
      const { t } = useTranslation()
      const { ColorPallet, TextTheme } = useTheme()
      return (
        <TourBox
          title={t('Tour.AddAndShare')}
          leftText={t('Tour.Skip')}
          rightText={t('Tour.Next')}
          onLeft={stop}
          onRight={next}
          current={current}
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
          >
            {t('Tour.AddAndShareDescription')}
          </Text>
        </TourBox>
      )
    },
  },
  {
    render: (props) => {
      const { current, next, stop, previous } = props
      const { t } = useTranslation()
      const { ColorPallet, TextTheme } = useTheme()
      return (
        <TourBox
          title={t('Tour.Notifications')}
          leftText={t('Tour.Back')}
          rightText={t('Tour.Next')}
          onLeft={previous}
          onRight={next}
          current={current}
          next={next}
          stop={stop}
          previous={previous}
          stepOn={2}
          stepsOutOf={3}
        >
          <Text
            style={{
              ...TextTheme.normal,
              color: ColorPallet.notification.infoText,
            }}
          >
            {t('Tour.NotificationsDescription')}
          </Text>
        </TourBox>
      )
    },
  },
  {
    render: (props) => {
      const { current, next, stop, previous } = props
      const { t } = useTranslation()
      const { ColorPallet, TextTheme } = useTheme()
      return (
        <TourBox
          title={t('Tour.YourCredentials')}
          leftText={t('Tour.Back')}
          rightText={t('Tour.Done')}
          onLeft={previous}
          onRight={stop}
          current={current}
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
          >
            {t('Tour.YourCredentialsDescription')}
          </Text>
        </TourBox>
      )
    },
  },
]
