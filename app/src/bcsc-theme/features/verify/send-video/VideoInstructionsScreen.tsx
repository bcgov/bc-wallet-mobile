import { VerificationPrompt } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import BrownHandHoldingPhone from '@assets/img/brown-hand-holding-phone.svg'
import { Button, ButtonType, ScreenWrapper, ThemedText, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type VideoInstructionsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VideoInstructions>
}

const VideoInstructionsScreen = ({ navigation }: VideoInstructionsScreenProps) => {
  const { Spacing, TextTheme, ColorPalette } = useTheme()
  const [store] = useStore<BCState>()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    image: {
      width: '100%',
      height: 250,
      marginBottom: Spacing.md,
    },
    bulletContainer: {
      flexDirection: 'row',
    },
    bullet: {
      marginRight: Spacing.xs,
    },
  })

  const controls = (
    <Button
      buttonType={ButtonType.Primary}
      title={t('BCSC.SendVideo.VideoInstructions.StartRecordingButton')}
      onPress={() => {
        navigation.navigate(BCSCScreens.TakeVideo)
      }}
      testID={'StartRecordingButton'}
      accessibilityLabel={t('BCSC.SendVideo.VideoInstructions.StartRecordingButton')}
    />
  )

  return (
    <ScreenWrapper controls={controls}>
      <BrownHandHoldingPhone style={styles.image} height={styles.image.height} width={styles.image.width} />
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.lg, textAlign: 'center' }}>
        {t('BCSC.SendVideo.VideoInstructions.Heading1')}
      </ThemedText>
      <ThemedText
        variant={'headingFour'}
        style={{ marginBottom: Spacing.xl, textAlign: 'center', color: ColorPalette.grayscale.black }}
      >
        {t('BCSC.SendVideo.VideoInstructions.Heading2')}
      </ThemedText>
      {store.bcsc.prompts?.map(({ prompt, id }: VerificationPrompt, index) => (
        <Fragment key={id}>
          <ThemedText variant={'headingFour'} style={{ textAlign: 'center', color: ColorPalette.grayscale.black }}>
            {index + 1}
          </ThemedText>
          <ThemedText
            style={{ marginBottom: Spacing.xl, textAlign: 'center', fontSize: TextTheme.headingFour.fontSize }}
          >
            {prompt}
          </ThemedText>
        </Fragment>
      ))}
      <ThemedText variant={'headingFour'} style={{ marginVertical: Spacing.lg }}>
        {t('BCSC.SendVideo.VideoInstructions.Heading3')}
      </ThemedText>

      <ThemedText variant={'headingFour'} style={{ marginVertical: Spacing.md, color: ColorPalette.grayscale.black }}>
        {t('BCSC.SendVideo.VideoInstructions.YouShould')}
      </ThemedText>

      <View style={styles.bulletContainer}>
        <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
        <ThemedText>{t('BCSC.SendVideo.VideoInstructions.Bullet1')}</ThemedText>
      </View>
      <View style={styles.bulletContainer}>
        <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
        <ThemedText>{t('BCSC.SendVideo.VideoInstructions.Bullet2')}</ThemedText>
      </View>
      <View style={styles.bulletContainer}>
        <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
        <ThemedText>{t('BCSC.SendVideo.VideoInstructions.Bullet3')}</ThemedText>
      </View>
      <View style={styles.bulletContainer}>
        <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
        <ThemedText>{t('BCSC.SendVideo.VideoInstructions.Bullet4')}</ThemedText>
      </View>
      <View style={styles.bulletContainer}>
        <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
        <ThemedText>{t('BCSC.SendVideo.VideoInstructions.Bullet5')}</ThemedText>
      </View>
      <View
        style={{
          flexDirection: 'row',
          borderColor: ColorPalette.grayscale.lightGrey,
          borderWidth: 1,
          borderRadius: Spacing.sm,
          padding: Spacing.md,
          marginTop: Spacing.lg,
        }}
      >
        <Icon name={'alert'} size={32} color={TextTheme.normal.color} style={{ marginRight: Spacing.md }} />
        <ThemedText variant={'headingFour'} style={{ flex: 1, textAlign: 'left', color: ColorPalette.grayscale.black }}>
          {t('BCSC.SendVideo.VideoInstructions.Heading4')}
        </ThemedText>
      </View>
    </ScreenWrapper>
  )
}

export default VideoInstructionsScreen
