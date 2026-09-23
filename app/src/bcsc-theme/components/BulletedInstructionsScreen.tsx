import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import BulletPointList from '@/components/BulletPointList'
import { Button, ButtonType, Link, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

export type SectionLink = {
  label: string
  onPress: () => void
  testID?: string
  /** Renders an external link icon and button that announces that the link leaves the app. */
  externalButton?: boolean
}

export type InstructionsSection = {
  heading: string
  paragraph?: string
  bullets?: string[]
  /** Optional inline link rendered before the section heading (e.g. "See accepted ID"). */
  link?: SectionLink
  /** Optional inline link rendered after the section content (e.g. "Which services?"). */
  footerLink?: SectionLink
}

type BulletedInstructionsScreenProps = {
  heading: string
  description?: string
  sections: InstructionsSection[]
  primaryAction: {
    label: string
    onPress: () => void
    testID?: string
    disabled?: boolean
  }
}

/**
 * A reusable layout for instructions screens that share the pattern:
 * heading → intro paragraph → one or more sections (each with a subheading
 * plus either body text or a bullet list) → a single primary CTA pinned to
 * the bottom in a ControlContainer.
 */
export const BulletedInstructionsScreen = ({
  heading,
  description,
  sections,
  primaryAction,
}: BulletedInstructionsScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()

  const buttonLabel = primaryAction.label || t('Global.Continue')

  const controls = (
    <ControlContainer>
      <Button
        title={buttonLabel}
        accessibilityLabel={buttonLabel}
        testID={primaryAction.testID ?? testIdWithKey(buttonLabel)}
        onPress={primaryAction.onPress}
        buttonType={ButtonType.Primary}
        disabled={primaryAction.disabled}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      padded={false}
      controls={controls}
      scrollViewContainerStyle={{
        flexGrow: 1,
        gap: Spacing.sm,
        padding: Spacing.lg,
      }}
    >
      <ThemedText variant={'headingThree'}>{heading}</ThemedText>
      {description ? <ThemedText>{description}</ThemedText> : null}
      {sections.map((section) => (
        <Section key={section.heading} section={section} iconColor={ColorPalette.brand.icon} iconSize={Spacing.xs} />
      ))}
    </ScreenWrapper>
  )
}

type SectionProps = {
  section: InstructionsSection
  iconColor: string
  iconSize: number
}

const Section = ({ section, iconColor, iconSize }: SectionProps) => (
  <>
    {section.link ? <SectionLinkView link={section.link} /> : null}
    <ThemedText variant={'headingFour'}>{section.heading}</ThemedText>
    {section.paragraph ? <ThemedText>{section.paragraph}</ThemedText> : null}
    {section.bullets && section.bullets.length > 0 ? (
      <BulletPointList translationKeys={section.bullets} iconColor={iconColor} iconSize={iconSize} />
    ) : null}
    {section.footerLink ? <SectionLinkView link={section.footerLink} /> : null}
  </>
)

const SectionLinkView = ({ link }: { link: SectionLink }) => {
  const { Buttons, Spacing } = useTheme()
  const { t } = useTranslation()
  const testID = link.testID ?? testIdWithKey(link.label)

  const styles = StyleSheet.create({
    // The button has no intrinsic width, so an inline wrapper keeps it from stretching to the section width.
    externalButtonWrapper: {
      alignSelf: 'flex-start',
      maxWidth: '100%',
    },
    externalButtonContent: {
      paddingHorizontal: Spacing.md,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing.sm,
    },
    externalButtonText: {
      ...Buttons.secondaryText,
      flexShrink: 1,
    },
  })

  if (!link.externalButton) {
    return <Link testID={testID} linkText={link.label} onPress={link.onPress} />
  }

  return (
    <View style={styles.externalButtonWrapper}>
      <Button
        buttonType={ButtonType.Secondary}
        title={''}
        accessibilityLabel={link.label}
        accessibilityHint={t('Global.A11y.OpensInBrowser')}
        testID={testID}
        onPress={link.onPress}
      >
        <View style={styles.externalButtonContent}>
          <ThemedText style={styles.externalButtonText}>{link.label}</ThemedText>
          <Icon name={'open-in-new'} size={24} color={Buttons.secondaryText.color} />
        </View>
      </Button>
    </View>
  )
}
