import React, { useEffect, useRef, useState } from 'react'
import { View, Animated, LayoutAnimation, I18nManager, Pressable } from 'react-native'
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'

import { toggleAnimation } from '../../animations/toggleAnimation'
import { AccordionItemProps } from '../../models/AccordionItem'

import { styles } from './styles'

const AccordionItem = ({
  customBody,
  customTitle,
  customIcon = undefined,
  containerStyle = {},
  animationDuration = 300,
  isRTL = false,
  isOpen = false,
  onPress = undefined,
  testID,
}: AccordionItemProps) => {
  const [showContent, setShowContent] = useState(isOpen)
  const animationController = useRef(new Animated.Value(isOpen ? 1 : 0)).current

  const toggleListItem = () => {
    const config = {
      duration: animationDuration,
      toValue: showContent ? 0 : 1,
      useNativeDriver: true,
    }
    Animated.timing(animationController, config).start()
    LayoutAnimation.configureNext(toggleAnimation(animationDuration))
    if (onPress) onPress(!showContent)
    setShowContent(!showContent)
  }

  useEffect(() => {
    if (showContent && !isOpen) {
      toggleListItem()
    }
  }, [isOpen])

  const arrowTransform = animationController.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', isRTL ? '-90deg' : '90deg'],
  })
  return (
    <View style={[styles.container, containerStyle]}>
      <Pressable onPress={() => toggleListItem()} testID={testID}>
        <View style={styles.titleContainer}>
          {(!isRTL || I18nManager.isRTL) && customTitle()}
          <Animated.View style={{ transform: [{ rotateZ: arrowTransform }] }}>
            {!customIcon ? (
              <MaterialIcons name={isRTL ? 'keyboard-arrow-left' : 'keyboard-arrow-right'} size={30} />
            ) : (
              customIcon()
            )}
          </Animated.View>
          {isRTL && !I18nManager.isRTL && customTitle()}
        </View>
      </Pressable>
      {showContent && customBody()}
    </View>
  )
}
export default AccordionItem
