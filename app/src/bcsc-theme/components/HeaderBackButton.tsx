import { selectOS } from '@/utils/os-utils'
import { ButtonLocation, IconButton } from '@bifold/core'
import { HeaderBackButtonProps } from '@react-navigation/elements'

/**
 * Shared Header Back Button component that navigates back on press.
 *
 * @returns {*} {JSX.Element}
 */
export const HeaderBackButton = (props: HeaderBackButtonProps) => {
  return (
    <IconButton
      buttonLocation={ButtonLocation.Left}
      icon={selectOS({ ios: 'chevron-back', android: 'arrow-left' })}
      accessibilityLabel={String(props.accessibilityLabel)}
      testID={String(props.testID)}
      onPress={() => props.onPress?.()}
    />
  )
}

/**
 * Creates a Header Back Button component.
 *
 * @returns {*} {JSX.Element}
 */
export const createHeaderBackButton = (props: HeaderBackButtonProps) => {
  return <HeaderBackButton {...props} />
}
