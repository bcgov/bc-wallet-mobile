import { ButtonLocation, IconButton, useTheme } from '@bifold/core'
import { HeaderBackButtonProps } from '@react-navigation/elements'

/**
 * Shared Header Back Button component that navigates back on press.
 */
export const HeaderBackButton = (props: HeaderBackButtonProps) => {
  const { ColorPalette } = useTheme()

  return (
    <IconButton
      buttonLocation={ButtonLocation.Left}
      icon={'arrow-left'}
      iconTintColor={ColorPalette.brand.primary}
      accessibilityLabel={String(props.accessibilityLabel)}
      testID={String(props.testID)}
      onPress={() => props.onPress?.()}
    />
  )
}

export const createHeaderBackButton = (props: HeaderBackButtonProps) => {
  return <HeaderBackButton {...props} />
}
