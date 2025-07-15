import { Button, ButtonType, ThemedText, useStore, useTheme } from '@bifold/core'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, StyleSheet, View } from 'react-native'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { BCState } from '@/store'
import { VerificationPrompt } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { Fragment, useEffect } from 'react'

type VideoInstructionsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.VideoInstructions>
}

const VideoInstructionsScreen = ({ navigation }: VideoInstructionsScreenProps) => {
  const { ColorPallet, Spacing, TextTheme } = useTheme()
  const [store] = useStore<BCState>()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPallet.brand.primaryBackground,
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
          Record a short video.
        </ThemedText>
        <ThemedText variant={'headingFour'} style={{ marginBottom: Spacing.xl, textAlign: 'center' }}>
          {`You'll be asked to`}
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
          A person at Service BC will watch the video. They need to hear and see you clearly.
        </ThemedText>
        <View style={styles.bulletContainer}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>Keep the video under 30 seconds in length</ThemedText>
        </View>
        <View style={styles.bulletContainer}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>Be the only person in the video</ThemedText>
        </View>
        <View style={styles.bulletContainer}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>Be in a quiet place</ThemedText>
        </View>
        <View style={styles.bulletContainer}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>Hold this device in front of your face</ThemedText>
        </View>
        <View style={styles.bulletContainer}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>Check your face ccan be seen in the video</ThemedText>
        </View>
        <View style={styles.bulletContainer}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>Say your first and last name</ThemedText>
        </View>
        <Icon
          name={'alert'}
          size={32}
          color={TextTheme.normal.color}
          style={{ marginVertical: Spacing.lg, alignSelf: 'center' }}
        />
        <ThemedText variant={'headingFour'} style={{ marginBottom: Spacing.xxl, textAlign: 'center' }}>
          Videos with inappropriate, offensive, or harassing behavior will not be accepted.
        </ThemedText>
        <Button
          buttonType={ButtonType.Primary}
          title={'Start Recording Video'}
          onPress={() => {
            navigation.navigate(BCSCScreens.TakeVideo)
          }}
          testID={'StartRecordingButton'}
          accessibilityLabel={'Start Recording Video'}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

export default VideoInstructionsScreen
