import { ThemedText, useStore, useTheme } from '@bifold/core'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import ComboCardImage from '@assets/img/combo_card.png'
import NoPhotoCardImage from '@assets/img/no_photo_card.png'
import PhotoCardImage from '@assets/img/photo_card.png'
import { StackNavigationProp } from '@react-navigation/stack'
import TileButton, { TileButtonProps } from '../../components/TileButton'
import { BCSCCardType } from '../../types/cards'

const COMBO_CARD = Image.resolveAssetSource(ComboCardImage).uri
const PHOTO_CARD = Image.resolveAssetSource(PhotoCardImage).uri
const NO_PHOTO_CARD = Image.resolveAssetSource(NoPhotoCardImage).uri

type IdentitySelectionScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.IdentitySelection>
}

const IdentitySelectionScreen: React.FC<IdentitySelectionScreenProps> = ({
  navigation,
}: IdentitySelectionScreenProps) => {
  const { t } = useTranslation()
  const { ColorPallet, Spacing } = useTheme()
  const [, dispatch] = useStore<BCState>()
  const { width } = useWindowDimensions()

  const styles = StyleSheet.create({
    scrollView: {
      flex: 1,
      paddingHorizontal: Spacing.md,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    heading: {
      marginTop: Spacing.md,
      marginBottom: Spacing.sm,
    },
    description: {
      marginBottom: Spacing.md,
    },
    pageBreakSlot: {
      position: 'relative',
      flex: 1,
      height: 8,
      marginTop: 8,
    },
    pageBreak: {
      position: 'absolute',
      width,
      height: 8,
      backgroundColor: ColorPallet.brand.secondaryBackground,
      left: -Spacing.md,
    },
    checkButton: {
      marginVertical: Spacing.md,
      flexWrap: 'wrap',
      flex: 1,
    },
    checkButtonText: {
      color: ColorPallet.brand.primary,
    },
  })

  const onPressCombinedCard = useCallback(() => {
    dispatch({ type: BCDispatchAction.UPDATE_CARD_TYPE, payload: [BCSCCardType.Combined] })
    navigation.navigate(BCSCScreens.SerialInstructions)
  }, [dispatch, navigation])

  const onPressPhotoCard = useCallback(() => {
    dispatch({ type: BCDispatchAction.UPDATE_CARD_TYPE, payload: [BCSCCardType.Photo] })
    navigation.navigate(BCSCScreens.SerialInstructions)
  }, [dispatch, navigation])

  const onPressNoPhotoCard = useCallback(() => {
    // TODO: Implement
  }, [])

  const onCheckForServicesCard = useCallback(() => {
    // TODO: Implement
  }, [])

  const onPressOtherID = useCallback(() => {
    // TODO: Implement
  }, [])

  const cardButtons = useMemo(() => {
    return (
      [
        {
          onPress: onPressCombinedCard,
          testIDKey: 'CombinedCard',
          accessibilityLabel: t('Unified.ChooseYourID.CombinedCard'),
          actionText: t('Unified.ChooseYourID.CombinedCardActionText'),
          description: t('Unified.ChooseYourID.CombinedCardDescription'),
          imgSrc: { uri: COMBO_CARD },
          style: { marginBottom: Spacing.md },
        },
        {
          onPress: onPressPhotoCard,
          testIDKey: 'PhotoCard',
          accessibilityLabel: t('Unified.ChooseYourID.PhotoCard'),
          actionText: t('Unified.ChooseYourID.PhotoCardActionText'),
          description: t('Unified.ChooseYourID.PhotoCardDescription'),
          imgSrc: { uri: PHOTO_CARD },
          style: { marginBottom: Spacing.md },
        },
        {
          onPress: onPressNoPhotoCard,
          testIDKey: 'NoPhotoCard',
          accessibilityLabel: t('Unified.ChooseYourID.NoPhotoCard'),
          actionText: t('Unified.ChooseYourID.NoPhotoCardActionText'),
          description: t('Unified.ChooseYourID.NoPhotoCardDescription'),
          imgSrc: { uri: NO_PHOTO_CARD },
          style: { marginBottom: Spacing.md },
        },
      ] as TileButtonProps[]
    ).map((props, i) => <TileButton {...props} key={i + 1} />)
  }, [onPressCombinedCard, onPressPhotoCard, onPressNoPhotoCard, t, Spacing])

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
      <ScrollView style={styles.scrollView}>
        <ThemedText variant={'headingThree'} style={styles.heading}>
          {t('Unified.ChooseYourID.WhatCardDoYou')}
        </ThemedText>
        <ThemedText style={styles.description}>{t('Unified.ChooseYourID.SomePeopleStillCallIt')}</ThemedText>
        {cardButtons}
        <View style={styles.pageBreakSlot}>
          <View style={styles.pageBreak} />
        </View>
        <ThemedText variant={'headingThree'} style={styles.heading}>
          {t('Unified.ChooseYourID.DontHaveOne')}
        </ThemedText>
        <ThemedText style={styles.description}>{t('Unified.ChooseYourID.CheckBefore')}</ThemedText>
        <Pressable
          onPress={onCheckForServicesCard}
          testID={'CheckForServicesCard'}
          accessibilityLabel={t('Unified.ChooseYourID.CheckForServicesCard')}
          style={styles.checkButton}
        >
          <ThemedText variant={'bold'} style={styles.checkButtonText}>
            {t('Unified.ChooseYourID.CheckIfIHave') + ' '}
            <Icon size={20} color={ColorPallet.brand.primary} name={'help-circle-outline'} />
          </ThemedText>
        </Pressable>
        <TileButton
          onPress={onPressOtherID}
          testIDKey={'OtherID'}
          accessibilityLabel={t('Unified.ChooseYourID.OtherID')}
          actionText={t('Unified.ChooseYourID.OtherIDActionText')}
          description={t('Unified.ChooseYourID.OtherIDDescription')}
          style={{ marginBottom: Spacing.md }}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

export default IdentitySelectionScreen
