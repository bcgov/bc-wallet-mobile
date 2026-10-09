import BulletPoint from '@/bcsc-theme/components/BulletPoint'
import { TestIds } from '@/test-ids/registry'
import { Link, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import useServiceNoticeViewModel from './useServiceNoticeViewModel'

/**
 * The full IAS service notice, opened from the warning banner on Home (or account landing),
 * followed by fixed guidance on what may take longer.
 *
 * @returns {*} {React.ReactElement} The ServiceNoticeScreen component.
 */
export const ServiceNoticeScreen = (): React.ReactElement => {
  const {
    headerText,
    messageText,
    sections,
    haveQuestionsText,
    contactUsLinkText,
    contactUsLinkHint,
    handleContactUs,
  } = useServiceNoticeViewModel()
  const { Spacing } = useTheme()

  const styles = StyleSheet.create({
    content: {
      padding: Spacing.lg,
      gap: Spacing.xl,
    },
    // The design sets section headings at 20pt on a 34pt line; the bold variant is body size (18/30)
    sectionHeading: {
      fontSize: 20,
      lineHeight: 34,
    },
  })

  return (
    <ScreenWrapper padded={false} scrollViewContainerStyle={styles.content}>
      <ThemedText variant={'headingThree'}>{headerText}</ThemedText>
      <ThemedText>{messageText}</ThemedText>
      {sections.map((section) => (
        <View key={section.heading}>
          <ThemedText variant={'bold'} style={styles.sectionHeading}>
            {section.heading}
          </ThemedText>
          <ThemedText>{section.description}</ThemedText>
          {section.bullets?.map((bullet) => <BulletPoint key={bullet} pointsText={bullet} />)}
        </View>
      ))}
      <View>
        <ThemedText variant={'bold'} style={styles.sectionHeading}>
          {haveQuestionsText}
        </ThemedText>
        <Link
          linkText={contactUsLinkText}
          onPress={handleContactUs}
          // @ts-expect-error Bifold's Link drops its typed textProps; untyped props like this reach the text
          accessibilityHint={contactUsLinkHint}
          testID={testIdWithKey(TestIds.main.serviceNotice.contactUs)}
        />
      </View>
    </ScreenWrapper>
  )
}
