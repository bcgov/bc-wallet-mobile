import { ButtonLocation, IconButton } from '@bifold/core'
import { HeaderBackButtonProps } from '@react-navigation/elements'

/**
 * Shared Header Right "More" Button component.
 *
 * @returns {*} {React.ReactElement}
 */
export const HeaderRightMoreButton = (props: HeaderBackButtonProps) => {
  return (
    <IconButton
      buttonLocation={ButtonLocation.Right}
      icon={'help-circle-outline'}
      accessibilityLabel={String(props.accessibilityLabel)}
      testID={String(props.testID)}
      onPress={() => props.onPress?.()}
    />
  )
}

/**
 * Creates a Header Right "More" Button component.
 *
 * @returns {*} {React.ReactElement}
 */
export const createHeaderRightMoreButton = (props: HeaderBackButtonProps) => {
  return <HeaderRightMoreButton {...props} />
}
