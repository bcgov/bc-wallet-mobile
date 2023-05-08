import { ViewStyle } from 'react-native'

export interface AccordionItemProps {
  /**
   * Function that returns a React element to display as Accordion title
   */
  customTitle: () => JSX.Element
  /**
   * Function that returns a React element to display as Accordion body
   */
  customBody: () => JSX.Element
  /**
   * An optional Function that returns a React element to display as Accordion icon
   * default icon keyboard-arrow-left
   */
  customIcon?: () => JSX.Element
  /**
   * An optional param to add custom container style
   */
  containerStyle?: ViewStyle
  /**
   *  An optional param to control Accordion animation duration
   *  default value is 300
   */
  animationDuration?: number
  /**
   *  An optional param to support RTL layout
   *  default value is false
   */
  isRTL?: boolean
  /**
   *  An optional param to make accordion item already open
   *  default value is false
   */
  isOpen?: boolean
  /**
   *  An optional param to call a function when a click happen to accordion item
   *  default value is undefined
   *  @param {boolean} isOpen the current state of the accordion item
   */
  onPress?: (isOpen: boolean) => void
  /**
   *  An optional param to support test ID 
   *  default value is ''
   */
  testID?: string
}
