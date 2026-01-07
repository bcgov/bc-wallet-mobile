import { ScreenWrapper, ThemedText, useTheme } from '@bifold/core'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, Pressable, StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { HelpCentreUrl } from '@/constants'
import ComboCardImage from '@assets/img/combo_card.png'
import NoPhotoCardImage from '@assets/img/no_photo_card.png'
import PhotoCardImage from '@assets/img/photo_card.png'
import { StackNavigationProp } from '@react-navigation/stack'
import TileButton, { TileButtonProps } from '../../components/TileButton'

const COMBO_CARD = Image.resolveAssetSource(ComboCardImage).uri
const PHOTO_CARD = Image.resolveAssetSource(PhotoCardImage).uri
const NO_PHOTO_CARD = Image.resolveAssetSource(NoPhotoCardImage).uri

type IdentitySelectionScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.IdentitySelection>
}

const IdentitySelectionScreen: React.FC<IdentitySelectionScreenProps> = ({
  navigation,
}: IdentitySelectionScreenProps) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()

  const styles = StyleSheet.create({
    checkButtonText: {
      color: ColorPalette.brand.primary,
    },
  })

  const onPressCombinedCard = useCallback(() => {
    navigation.navigate(BCSCScreens.SerialInstructions)
  }, [navigation])

  const onPressPhotoCard = useCallback(() => {
    navigation.navigate(BCSCScreens.SerialInstructions)
  }, [navigation])

  const onPressNoPhotoCard = useCallback(() => {
    navigation.navigate(BCSCScreens.SerialInstructions)
  }, [navigation])

  const onCheckForServicesCard = useCallback(() => {
    navigation.navigate(BCSCScreens.VerifyWebView, { title: '', url: HelpCentreUrl.HELP_CHECK_BCSC })
  }, [navigation])

  const onPressOtherID = useCallback(async () => {
    navigation.navigate(BCSCScreens.DualIdentificationRequired)
  }, [navigation])

  const cardButtons = useMemo(() => {
    return (
      [
        {
          onPress: onPressCombinedCard,
          testIDKey: 'CombinedCard',
          accessibilityLabel: t('BCSC.ChooseYourID.CombinedCard'),
          actionText: t('BCSC.ChooseYourID.CombinedCardActionText'),
          description: t('BCSC.ChooseYourID.CombinedCardDescription'),
          imgSrc: { uri: COMBO_CARD },
          style: { marginBottom: Spacing.md },
        },
        {
          onPress: onPressPhotoCard,
          testIDKey: 'PhotoCard',
          accessibilityLabel: t('BCSC.ChooseYourID.PhotoCard'),
          actionText: t('BCSC.ChooseYourID.PhotoCardActionText'),
          description: t('BCSC.ChooseYourID.PhotoCardDescription'),
          imgSrc: { uri: PHOTO_CARD },
          style: { marginBottom: Spacing.md },
        },
        {
          onPress: onPressNoPhotoCard,
          testIDKey: 'NoPhotoCard',
          accessibilityLabel: t('BCSC.ChooseYourID.NoPhotoCard'),
          actionText: t('BCSC.ChooseYourID.NoPhotoCardActionText'),
          description: t('BCSC.ChooseYourID.NoPhotoCardDescription'),
          imgSrc: { uri: NO_PHOTO_CARD },
          style: { marginBottom: Spacing.md },
        },
      ] as TileButtonProps[]
    ).map((props, i) => <TileButton {...props} key={i + 1} />)
  }, [onPressCombinedCard, onPressPhotoCard, onPressNoPhotoCard, t, Spacing])

  return (
    <ScreenWrapper scrollViewContainerStyle={{ gap: Spacing.md }}>
      <View style={{ gap: Spacing.md }}>
        <ThemedText variant={'headingThree'}>{t('BCSC.ChooseYourID.WhatCardDoYou')}</ThemedText>
        <ThemedText>{t('BCSC.ChooseYourID.SomePeopleStillCallIt')}</ThemedText>
      </View>
      <View>{cardButtons}</View>
      <View style={{ gap: Spacing.md }}>
        <ThemedText variant={'headingThree'}>{t('BCSC.ChooseYourID.DontHaveOne')}</ThemedText>
        <ThemedText>{t('BCSC.ChooseYourID.CheckBefore')}</ThemedText>
        <Pressable
          onPress={onCheckForServicesCard}
          testID={'CheckForServicesCard'}
          accessibilityLabel={t('BCSC.ChooseYourID.CheckForServicesCard')}
        >
          <ThemedText variant={'bold'} style={styles.checkButtonText}>
            {t('BCSC.ChooseYourID.CheckIfIHave') + ' '}
            <Icon size={20} color={ColorPalette.brand.primary} name={'help-circle-outline'} />
          </ThemedText>
        </Pressable>
        <TileButton
          onPress={onPressOtherID}
          testIDKey={'OtherID'}
          accessibilityLabel={t('BCSC.ChooseYourID.OtherID')}
          actionText={t('BCSC.ChooseYourID.OtherIDActionText')}
          description={t('BCSC.ChooseYourID.OtherIDDescription')}
          style={{ marginBottom: Spacing.md }}
        />
      </View>
    </ScreenWrapper>
  )
}

export default IdentitySelectionScreen
