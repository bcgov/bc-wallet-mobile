import { ButtonLocation, IconButton } from '@bifold/core'
import { HeaderBackButtonProps } from '@react-navigation/elements'

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

export const createHeaderRightMoreButton = (props: HeaderBackButtonProps) => {
  return <HeaderRightMoreButton {...props} />
}
