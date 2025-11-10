import { VerificationPrompt } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { Button, ButtonType, ThemedText, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type VideoInstructionsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VideoInstructions>
}

const VideoInstructionsScreen = ({ navigation }: VideoInstructionsScreenProps) => {
  const { ColorPalette, Spacing, TextTheme } = useTheme()
  const [store] = useStore<BCState>()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    scrollView: {
      flexGrow: 1,
      padding: Spacing.md,
    },
    mainIcon: {
      marginTop: Spacing.md,
      marginBottom: Spacing.xxl,
      alignSelf: 'center',
    },
    lineBreak: {
      borderBottomWidth: 1,
      borderBottomColor: TextTheme.normal.color,
      width: '100%',
    },
    bulletContainer: {
      flexDirection: 'row',
      marginBottom: Spacing.md,
    },
    bullet: {
      marginRight: Spacing.xs,
    },
  })

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <Icon name={'video'} size={112} color={TextTheme.normal.color} style={styles.mainIcon} />
        <ThemedText variant={'headingTwo'} style={{ marginBottom: Spacing.lg }}>
          {t('BCSC.SendVideo.VideoInstructions.Heading1')}
        </ThemedText>
        <ThemedText variant={'headingFour'} style={{ marginBottom: Spacing.xl, textAlign: 'center' }}>
          {t('BCSC.SendVideo.VideoInstructions.Heading2')}
        </ThemedText>
        {store.bcsc.prompts?.map(({ prompt, id }: VerificationPrompt, index) => (
          <Fragment key={id}>
            <ThemedText variant={'headingFour'} style={{ textAlign: 'center' }}>
              {index + 1}
            </ThemedText>
            <ThemedText style={{ marginBottom: Spacing.xl, textAlign: 'center' }}>{prompt}</ThemedText>
          </Fragment>
        ))}
        <View style={styles.lineBreak} />
        <ThemedText variant={'headingFour'} style={{ marginVertical: Spacing.xl }}>
          {t('BCSC.SendVideo.VideoInstructions.Heading3')}
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
        <View style={styles.bulletContainer}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>{t('BCSC.SendVideo.VideoInstructions.Bullet6')}</ThemedText>
        </View>
        <Icon
          name={'alert'}
          size={32}
          color={TextTheme.normal.color}
          style={{ marginVertical: Spacing.lg, alignSelf: 'center' }}
        />
        <ThemedText variant={'headingFour'} style={{ marginBottom: Spacing.xxl, textAlign: 'center' }}>
          {t('BCSC.SendVideo.VideoInstructions.Heading4')}
        </ThemedText>
        <Button
          buttonType={ButtonType.Primary}
          title={t('BCSC.SendVideo.VideoInstructions.StartRecordingButton')}
          onPress={() => {
            navigation.navigate(BCSCScreens.TakeVideo)
          }}
          testID={'StartRecordingButton'}
          accessibilityLabel={t('BCSC.SendVideo.VideoInstructions.StartRecordingButton')}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

export default VideoInstructionsScreen
