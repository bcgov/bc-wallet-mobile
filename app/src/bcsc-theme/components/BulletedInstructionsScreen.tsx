import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import BulletPointList from '@/components/BulletPointList'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'

export type InstructionsSection = {
  heading: string
  paragraph?: string
  bullets?: string[]
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
    <ThemedText variant={'headingFour'}>{section.heading}</ThemedText>
    {section.paragraph ? <ThemedText>{section.paragraph}</ThemedText> : null}
    {section.bullets && section.bullets.length > 0 ? (
      <BulletPointList translationKeys={section.bullets} iconColor={iconColor} iconSize={iconSize} />
    ) : null}
  </>
)
