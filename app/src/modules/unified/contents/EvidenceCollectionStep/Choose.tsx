import { useStore, useTheme } from '@hyperledger/aries-bifold-core'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, StyleSheet, ScrollView, Pressable, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import TileButton, { TileButtonProps } from '../../components/TileButton'
import { BCDispatchAction, BCState } from '../../../../store'
import { UnifiedCardType } from '../../types'

const pagePadding = 24

type ChooseContentProps = {
  goToInstructions: () => void
}

const ChooseContent: React.FC<ChooseContentProps> = ({ goToInstructions }: ChooseContentProps) => {
  const { t } = useTranslation()
  const { ColorPallet, TextTheme } = useTheme()
  const [, dispatch] = useStore<BCState>()
  const { width } = useWindowDimensions()

  const styles = StyleSheet.create({
    scrollView: {
      flex: 1,
      paddingHorizontal: pagePadding,
      backgroundColor: ColorPallet.brand.secondaryBackground,
    },
    heading: {
      ...TextTheme.headingThree,
      marginTop: 24,
      marginBottom: 16,
    },
    description: {
      ...TextTheme.normal,
      marginBottom: 16,
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
      backgroundColor: ColorPallet.grayscale.veryLightGrey,
      left: -pagePadding,
    },
    checkButton: {
      marginVertical: 16,
      flexWrap: 'wrap',
      flex: 1,
    },
    checkButtonText: {
      ...TextTheme.bold,
      color: ColorPallet.brand.primary,
    },
  })

  const onPressCombinedCard = useCallback(() => {
    dispatch({ type: BCDispatchAction.UPDATE_CARD_TYPE, payload: [UnifiedCardType.Combined] })
    goToInstructions()
  }, [dispatch, goToInstructions])

  const onPressPhotoCard = useCallback(() => {
    // TODO: Implement
  }, [])

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
          imgSrc: require('../../assets/img/combo_card.png'),
          style: { marginBottom: 16 },
        },
        {
          onPress: onPressPhotoCard,
          testIDKey: 'PhotoCard',
          accessibilityLabel: t('Unified.ChooseYourID.PhotoCard'),
          actionText: t('Unified.ChooseYourID.PhotoCardActionText'),
          description: t('Unified.ChooseYourID.PhotoCardDescription'),
          imgSrc: require('../../assets/img/photo_card.png'),
          style: { marginBottom: 16 },
        },
        {
          onPress: onPressNoPhotoCard,
          testIDKey: 'NoPhotoCard',
          accessibilityLabel: t('Unified.ChooseYourID.NoPhotoCard'),
          actionText: t('Unified.ChooseYourID.NoPhotoCardActionText'),
          description: t('Unified.ChooseYourID.NoPhotoCardDescription'),
          imgSrc: require('../../assets/img/no_photo_card.png'),
          style: { marginBottom: 16 },
        },
      ] as TileButtonProps[]
    ).map((props, i) => <TileButton {...props} key={i + 1} />)
  }, [onPressCombinedCard, onPressPhotoCard, onPressNoPhotoCard, t])

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.heading}>{t('Unified.ChooseYourID.WhatCardDoYou')}</Text>
        <Text style={styles.description}>{t('Unified.ChooseYourID.SomePeopleStillCallIt')}</Text>
        {cardButtons}
        <View style={styles.pageBreakSlot}>
          <View style={styles.pageBreak} />
        </View>
        <Text style={styles.heading}>{t('Unified.ChooseYourID.DontHaveOne')}</Text>
        <Text style={styles.description}>{t('Unified.ChooseYourID.CheckBefore')}</Text>
        <Pressable
          onPress={onCheckForServicesCard}
          testID={'CheckForServicesCard'}
          accessibilityLabel={t('Unified.ChooseYourID.CheckForServicesCard')}
          style={styles.checkButton}
        >
          <Text style={styles.checkButtonText}>
            {t('Unified.ChooseYourID.CheckIfIHave') + ' '}
            <Icon size={20} color={ColorPallet.brand.primary} name={'help-circle-outline'} />
          </Text>
        </Pressable>
        <TileButton
          onPress={onPressOtherID}
          testIDKey={'OtherID'}
          accessibilityLabel={t('Unified.ChooseYourID.OtherID')}
          actionText={t('Unified.ChooseYourID.OtherIDActionText')}
          description={t('Unified.ChooseYourID.OtherIDDescription')}
          style={{ marginBottom: 16 }}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

export default ChooseContent
