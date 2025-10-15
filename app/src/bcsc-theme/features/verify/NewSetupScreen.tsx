import { RadioGroup } from '@/bcsc-theme/components/RadioGroup'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

const iconSize = 40

type NewSetupScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.NewSetup>
}

const NewSetupScreen = ({ navigation }: NewSetupScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const [, dispatch] = useStore<BCState>()
  const { t } = useTranslation()
  const [myOwnId, setMyOwnId] = useState<boolean>()
  const [otherPersonPresent, setOtherPersonPresent] = useState<boolean>()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
    },
    contentContainer: {
      flexGrow: 1,
    },
    controlsContainer: {
      marginTop: 'auto',
      gap: Spacing.sm,
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
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.pageContainer}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.md }}>
          {t('Unified.NewSetup.Title')}
        </ThemedText>
        <ThemedText variant={'bold'} style={{ marginBottom: Spacing.md }}>
          {t('Unified.NewSetup.YouWillNeedTo')}
        </ThemedText>
        <View style={styles.bulletContainer}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>{t('Unified.NewSetup.AddPhotoID')}</ThemedText>
        </View>
        <View style={[styles.bulletContainer, { marginBottom: Spacing.lg }]}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>{t('Unified.NewSetup.RecordVideoOrVisit')}</ThemedText>
        </View>
        <ThemedText variant={'bold'}>{t('Unified.NewSetup.WhoseIDQuestion')}</ThemedText>
        <RadioGroup
          style={{ marginVertical: Spacing.md }}
          options={[
            { label: t('Unified.NewSetup.MyOwnID'), value: 'true' },
            { label: t('Unified.NewSetup.SomeoneElsesID'), value: 'false' },
          ]}
          selectedValue={myOwnId?.toString()}
          onValueChange={(value) => {
            if (value === 'true') {
              setOtherPersonPresent(undefined)
            }

            setMyOwnId(value === 'true')
          }}
          testID={testIdWithKey('MyOwnIdRadioGroup')}
        />
        {myOwnId === false ? (
          <>
            <ThemedText variant={'bold'}>{t('Unified.NewSetup.IsOtherPersonWithYou')}</ThemedText>
            <RadioGroup
              style={{ marginVertical: Spacing.md }}
              options={[
                { label: t('Unified.NewSetup.Yes'), value: 'true' },
                { label: t('Unified.NewSetup.No'), value: 'false' },
              ]}
              selectedValue={otherPersonPresent?.toString()}
              onValueChange={(value) => setOtherPersonPresent(value === 'true')}
              testID={testIdWithKey('OtherPersonPresentRadioGroup')}
            />
          </>
        ) : null}
        {otherPersonPresent === false ? (
          <InfoTextBox type={InfoBoxType.Error} style={{ marginBottom: Spacing.lg }}>
            {t('Unified.NewSetup.CannotFinishWithoutOtherPerson')}
          </InfoTextBox>
        ) : null}
        {otherPersonPresent !== undefined ? (
          <>
            <ThemedText variant={'bold'}>{t('Unified.NewSetup.OKToGiveHelp')}</ThemedText>
            <View style={styles.helpSection}>
              <Icon name={'check'} size={iconSize} color={ColorPalette.brand.primary} />
              <View style={styles.helpSectionTextContainer}>
                <ThemedText variant={'bold'} style={styles.helpSectionTitle}>
                  {t('Unified.NewSetup.YouCan')}
                </ThemedText>
                <View style={styles.bulletContainer}>
                  <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
                  <ThemedText style={styles.bulletText}>{t('Unified.NewSetup.YouCanReadInstructions')}</ThemedText>
                </View>
                <View style={styles.bulletContainer}>
                  <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
                  <ThemedText style={styles.bulletText}>{t('Unified.NewSetup.YouCanNavigateApp')}</ThemedText>
                </View>
                <View style={styles.bulletContainer}>
                  <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
                  <ThemedText style={styles.bulletText}>{t('Unified.NewSetup.YouCanTypeOrScan')}</ThemedText>
                </View>
              </View>
            </View>
            <View style={styles.helpSection}>
              <Icon name={'cancel'} size={iconSize} color={ColorPalette.brand.primary} />
              <View style={styles.helpSectionTextContainer}>
                <ThemedText variant={'bold'} style={styles.helpSectionTitle}>
                  {t('Unified.NewSetup.YouCannot')}
                </ThemedText>
                <View style={styles.bulletContainer}>
                  <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
                  <ThemedText style={styles.bulletText}>{t('Unified.NewSetup.YouCannotBeInVideo')}</ThemedText>
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
            disabled={myOwnId === undefined || (myOwnId === false && otherPersonPresent === undefined)}
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
      </ScrollView>
    </SafeAreaView>
  )
}

export default NewSetupScreen
