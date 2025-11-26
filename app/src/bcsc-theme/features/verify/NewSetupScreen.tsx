import { RadioGroup } from '@/bcsc-theme/components/RadioGroup'
import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import {
  Button,
  ButtonType,
  InfoBoxType,
  InfoTextBox,
  testIdWithKey,
  ThemedText,
  useStore,
  useTheme,
} from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

const iconSize = 40

type NewSetupScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.NewSetup>
}

const NewSetupScreen = ({ navigation }: NewSetupScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const [, dispatch] = useStore<BCState>()
  const { t } = useTranslation()
  const [myOwnId, setMyOwnId] = useState<boolean>()
  const [otherPersonPresent, setOtherPersonPresent] = useState<boolean>()
  const canContinue = useMemo(
    () => myOwnId !== undefined && (myOwnId === true || otherPersonPresent !== undefined),
    [myOwnId, otherPersonPresent]
  )

  const styles = StyleSheet.create({
    controlsContainer: {
      marginTop: 'auto',
      gap: Spacing.md,
    },
    bulletContainer: {
      flexDirection: 'row',
      marginBottom: Spacing.md,
      marginLeft: Spacing.sm,
      flexShrink: 1,
    },
    bullet: {
      marginRight: Spacing.xs,
    },
    bulletText: {
      flexShrink: 1,
      flexWrap: 'wrap',
    },
    helpSection: {
      flexDirection: 'row',
      padding: Spacing.md,
      gap: Spacing.md,
      flex: 1,
    },
    helpSectionTextContainer: {
      paddingTop: Spacing.sm,
      flex: 1,
    },
    helpSectionTitle: {
      marginBottom: Spacing.sm,
    },
  })

  return (
    <ScreenWrapper>
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.NewSetup.Title')}
      </ThemedText>
      <ThemedText variant={'bold'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.NewSetup.YouWillNeedTo')}
      </ThemedText>
      <View style={styles.bulletContainer}>
        <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
        <ThemedText>{t('BCSC.NewSetup.AddPhotoID')}</ThemedText>
      </View>
      <View style={[styles.bulletContainer, { marginBottom: Spacing.lg }]}>
        <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
        <ThemedText>{t('BCSC.NewSetup.RecordVideoOrVisit')}</ThemedText>
      </View>
      <ThemedText variant={'bold'}>{t('BCSC.NewSetup.WhoseIDQuestion')}</ThemedText>
      <RadioGroup<boolean>
        style={{ marginVertical: Spacing.md }}
        options={[
          { label: t('BCSC.NewSetup.MyOwnID'), value: true },
          { label: t('BCSC.NewSetup.SomeoneElsesID'), value: false },
        ]}
        selectedValue={myOwnId}
        onValueChange={(value) => {
          if (value) {
            setOtherPersonPresent(undefined)
          }

          setMyOwnId(value)
        }}
        testID={testIdWithKey('MyOwnIdRadioGroup')}
      />
      {myOwnId === false ? (
        <>
          <ThemedText variant={'bold'}>{t('BCSC.NewSetup.IsOtherPersonWithYou')}</ThemedText>
          <RadioGroup<boolean>
            style={{ marginVertical: Spacing.md }}
            options={[
              { label: t('BCSC.NewSetup.Yes'), value: true },
              { label: t('BCSC.NewSetup.No'), value: false },
            ]}
            selectedValue={otherPersonPresent}
            onValueChange={(value) => setOtherPersonPresent(value)}
            testID={testIdWithKey('OtherPersonPresentRadioGroup')}
          />
        </>
      ) : null}
      {otherPersonPresent === false ? (
        <InfoTextBox type={InfoBoxType.Error} style={{ marginBottom: Spacing.lg }}>
          {t('BCSC.NewSetup.CannotFinishWithoutOtherPerson')}
        </InfoTextBox>
      ) : null}
      {typeof otherPersonPresent === 'boolean' ? (
        <>
          <ThemedText variant={'bold'}>{t('BCSC.NewSetup.OKToGiveHelp')}</ThemedText>
          <View style={styles.helpSection}>
            <Icon name={'check'} size={iconSize} color={ColorPalette.brand.primary} />
            <View style={styles.helpSectionTextContainer}>
              <ThemedText variant={'bold'} style={styles.helpSectionTitle}>
                {t('BCSC.NewSetup.YouCan')}
              </ThemedText>
              <View style={styles.bulletContainer}>
                <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
                <ThemedText style={styles.bulletText}>{t('BCSC.NewSetup.YouCanReadInstructions')}</ThemedText>
              </View>
              <View style={styles.bulletContainer}>
                <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
                <ThemedText style={styles.bulletText}>{t('BCSC.NewSetup.YouCanNavigateApp')}</ThemedText>
              </View>
              <View style={styles.bulletContainer}>
                <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
                <ThemedText style={styles.bulletText}>{t('BCSC.NewSetup.YouCanTypeOrScan')}</ThemedText>
              </View>
            </View>
          </View>
          <View style={styles.helpSection}>
            <Icon name={'cancel'} size={iconSize} color={ColorPalette.brand.primary} />
            <View style={styles.helpSectionTextContainer}>
              <ThemedText variant={'bold'} style={styles.helpSectionTitle}>
                {t('BCSC.NewSetup.YouCannot')}
              </ThemedText>
              <View style={styles.bulletContainer}>
                <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
                <ThemedText style={styles.bulletText}>{t('BCSC.NewSetup.YouCannotBeInVideo')}</ThemedText>
              </View>
            </View>
          </View>
        </>
      ) : null}
      <View style={styles.controlsContainer}>
        <Button
          buttonType={ButtonType.Primary}
          title={t('Global.Continue')}
          onPress={() => {
            dispatch({ type: BCDispatchAction.UPDATE_COMPLETED_NEW_SETUP, payload: [true] })
            navigation.navigate(BCSCScreens.SetupSteps)
          }}
          testID={testIdWithKey('Continue')}
          accessibilityLabel={t('Global.Continue')}
          disabled={!canContinue}
        />
        <Button
          buttonType={ButtonType.Secondary}
          title={t('Global.Cancel')}
          onPress={() => {
            navigation.goBack()
          }}
          testID={testIdWithKey('Cancel')}
          accessibilityLabel={t('Global.Cancel')}
        />
      </View>
    </ScreenWrapper>
  )
}

export default NewSetupScreen
