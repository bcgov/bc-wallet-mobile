import { VerificationPrompt } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import useVideoPrompts from '@/bcsc-theme/hooks/useVideoPrompts'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { useAlerts } from '@/hooks/useAlerts'
import { BCState } from '@/store'
import BrownHandHoldingPhone from '@assets/img/brown-hand-holding-phone.svg'
import { Button, ButtonType, ScreenWrapper, ThemedText, useStore, useTheme } from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { Fragment, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type VideoInstructionsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VideoInstructions>
}

/** `failed` is distinct from `loading` so a failed fetch offers a retry instead of an endless spinner. */
type PromptsStatus = 'loading' | 'ready' | 'failed'

const VideoInstructionsScreen = ({ navigation }: VideoInstructionsScreenProps) => {
  const { Spacing, TextTheme, ColorPalette } = useTheme()
  const [store] = useStore<BCState>()
  const { t } = useTranslation()
  const { refreshPrompts } = useVideoPrompts()
  const { videoPromptsMissingAlert } = useAlerts(navigation)
  const [promptsStatus, setPromptsStatus] = useState<PromptsStatus>('loading')

  /**
   * Issues the prompt set for the recording that is about to happen. The list below is what the user is
   * asked on camera, so it has to be the set that was just issued; recording against a set from an
   * earlier attempt is the bug this guards against. Start stays disabled until a fresh set lands.
   *
   * A failure is a distinct state, not a stuck 'loading': the alert it raises is dismiss-only, and this
   * screen sits after every photo step, so leaving a spinner up would strand the user somewhere they can
   * only escape by redoing the photos. `failed` puts a retry in front of them instead.
   */
  const loadPrompts = useCallback(async (): Promise<void> => {
    setPromptsStatus('loading')

    const ready = await refreshPrompts()

    setPromptsStatus(ready ? 'ready' : 'failed')
    if (!ready) {
      videoPromptsMissingAlert()
    }
  }, [refreshPrompts, videoPromptsMissingAlert])

  // Runs on every arrival, including returning here after cancelling a recording or backing out of the
  // review screen. `refreshPrompts` and the alert are stable, so this fires once per focus.
  useFocusEffect(
    useCallback(() => {
      loadPrompts()
    }, [loadPrompts])
  )

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
    <View style={{ marginTop: Spacing.lg }}>
      <Button
        buttonType={ButtonType.Primary}
        title={t('BCSC.SendVideo.VideoInstructions.StartRecordingButton')}
        onPress={() => {
          navigation.navigate(BCSCScreens.TakeVideo)
        }}
        testID={'StartRecordingButton'}
        accessibilityLabel={t('BCSC.SendVideo.VideoInstructions.StartRecordingButton')}
        disabled={promptsStatus !== 'ready'}
      />
    </View>
  )

  return (
    <ScreenWrapper
      padded={false}
      edges={['top', 'bottom', 'left', 'right']}
      scrollViewContainerStyle={{ padding: Spacing.lg }}
    >
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
      {/* Held back until the refresh lands so the user is never shown a set from an earlier attempt. */}
      {promptsStatus === 'ready' &&
        store.bcsc.prompts?.map(({ prompt, id }: VerificationPrompt, index) => (
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
      {promptsStatus === 'loading' && (
        <ActivityIndicator style={{ marginBottom: Spacing.xl }} testID={'PromptsLoading'} />
      )}
      {promptsStatus === 'failed' && (
        <Button
          buttonType={ButtonType.Secondary}
          title={t('Global.Retry')}
          onPress={loadPrompts}
          testID={'RetryLoadPrompts'}
          accessibilityLabel={t('Global.Retry')}
        />
      )}
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
      {controls}
    </ScreenWrapper>
  )
}

export default VideoInstructionsScreen
