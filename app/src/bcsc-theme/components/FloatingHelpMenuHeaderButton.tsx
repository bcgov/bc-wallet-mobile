import { ButtonLocation, IconButton, testIdWithKey } from '@bifold/core'
import React, { ReactElement, useState } from 'react'
import { useTranslation } from 'react-i18next'
import FloatingHelpMenu from './FloatingHelpMenu'
import { ListButton, ListButtonGroup, ListButtonProps } from './ListButton'

type FloatingHelpMenuButtonProps = {
  children: ReactElement<ListButtonProps> | ReactElement<ListButtonProps>[]
}

/**
 * Renders a floating help menu button in the header, which opens a menu with provided options when pressed.
 *
 * @param props - The props for the FloatingHelpMenuButton component, including the menu options as children.
 * @returns The FloatingHelpMenuButton component with an IconButton and a FloatingHelpMenu.
 */
const FloatingHelpMenuButton = (props: FloatingHelpMenuButtonProps) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <IconButton
        buttonLocation={ButtonLocation.Right}
        icon={'help-circle'}
        accessibilityLabel={t('BCSC.HelpMenu.AccessibilityLabel')}
        testID={testIdWithKey('HelpMenu')}
        onPress={() => setOpen(true)}
      />
      <FloatingHelpMenu open={open} onClose={() => setOpen(false)}>
        <ListButtonGroup>{props.children}</ListButtonGroup>
      </FloatingHelpMenu>
    </>
  )
}

/**
 * Factory function to create a help menu button for the MainStack/TabStack header.
 *
 * @returns A React component that renders a floating help menu button
 */
export const createMainFloatingMenuButton = () => {
  const MainHeaderRight = () => {
    const { t } = useTranslation()

    return (
      <FloatingHelpMenuButton>
        <ListButton
          text={t('BCSC.HelpMenu.LearnMore')}
          onPress={() => {
            // TODO (V4.1.x): Implement Learn More page and link here
          }}
        />
        <ListButton
          text={t('BCSC.HelpMenu.GiveFeedback')}
          onPress={() => {
            // TODO (V4.1.x): Implement Give Feedback page and link here
          }}
        />
        <ListButton
          text={t('BCSC.HelpMenu.ReportProblem')}
          onPress={() => {
            // TODO (V4.1.x): Implement Report a Problem page and link here
          }}
        />
      </FloatingHelpMenuButton>
    )
  }

  return MainHeaderRight
}
