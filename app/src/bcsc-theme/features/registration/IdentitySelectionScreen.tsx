import { View, Text, Button, useWindowDimensions, StyleSheet, ScrollView, Pressable } from 'react-native'
import { BCSCScreens, BCSCVerifyIdentityStackParamList } from '@/bcsc-theme/types/navigators'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useWorkflow } from '@/contexts/WorkFlowContext'
import { useStore, useTheme } from '@bifold/core'

import { useTranslation } from 'react-i18next'
import { useCallback, useMemo } from 'react'
import TileButton, { TileButtonProps } from '@/bcsc-theme/components/TileButton'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type IdentitySelectionScreenProps = {
  navigation: NativeStackNavigationProp<BCSCVerifyIdentityStackParamList, BCSCScreens.IdentitySelection>
  route: { params: { stepIndex: number } }
}
const IdentitySelectionScreen: React.FC<IdentitySelectionScreenProps> = ({ navigation, route }) => {
  console.log('IDENTITY SELECTION COMPONENT RENDERED')
  const { nextStep } = useWorkflow()
  const { stepIndex } = route.params
  const { t } = useTranslation()
  const { ColorPallet, TextTheme } = useTheme()
  const { width } = useWindowDimensions()

  const styles = StyleSheet.create({
    scrollView: {
      flex: 1,
      paddingHorizontal: 24,
      backgroundColor: ColorPallet.brand.primaryBackground,
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
      backgroundColor: ColorPallet.brand.secondaryBackground,
      left: -24,
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
    nextStep(navigation, stepIndex)
  }, [])

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
          imgSrc: require('@assets/img/combo_card.png'),
          style: { marginBottom: 16 },
        },
        {
          onPress: onPressPhotoCard,
          testIDKey: 'PhotoCard',
          accessibilityLabel: t('Unified.ChooseYourID.PhotoCard'),
          actionText: t('Unified.ChooseYourID.PhotoCardActionText'),
          description: t('Unified.ChooseYourID.PhotoCardDescription'),
          imgSrc: require('@assets/img/photo_card.png'),
          style: { marginBottom: 16 },
        },
        {
          onPress: onPressNoPhotoCard,
          testIDKey: 'NoPhotoCard',
          accessibilityLabel: t('Unified.ChooseYourID.NoPhotoCard'),
          actionText: t('Unified.ChooseYourID.NoPhotoCardActionText'),
          description: t('Unified.ChooseYourID.NoPhotoCardDescription'),
          imgSrc: require('@assets/img/no_photo_card.png'),
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
export default IdentitySelectionScreen
