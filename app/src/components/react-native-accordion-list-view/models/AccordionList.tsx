import { FlatListProps, ViewStyle } from 'react-native'

export interface AccordionListProps extends Omit<FlatListProps<any>, 'data' | 'renderItem'> {
  /**
   * For simplicity, data is a plain array.
   * If you want to use something else, like an immutable list
   */
  data: any[]
  /**
   * Function that returns a React element to display as Accordion title
   */
  customTitle: (item: any) => JSX.Element
  /**
   * Function that returns a React element to display as Accordion body
   */
  customBody: (item: any) => JSX.Element
  /**
   * An optional Function that returns a React element to display as Accordion icon
   * default icon keyboard-arrow-left
   */
  customIcon?: () => JSX.Element
  /**
   * An optional param to add custom container item style
   */
  containerItemStyle?: ViewStyle
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
   * Allow more than one section to be expanded.
   * default value is false
   */
  expandMultiple?: boolean
}
