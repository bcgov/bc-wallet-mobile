import React, { useEffect, useRef, useState } from 'react'
import { View, Animated, LayoutAnimation, I18nManager, Pressable } from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

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

  const iconRotation = animationController.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', isRTL ? '-180deg' : '180deg'],
  })

  return (
    <View>
      <Pressable
        onPress={() => toggleListItem()}
        testID={testID}
        style={[styles.container, containerStyle]}
        accessibilityRole="button"
        accessibilityState={{ expanded: showContent }}
      >
        <View style={styles.titleContainer}>
          {(!isRTL || I18nManager.isRTL) && customTitle()}
          {!customIcon ? (
            <Animated.View style={{ transform: [{ rotate: iconRotation }] }}>
              <MaterialCommunityIcons name={showContent || isOpen ? 'minus' : 'plus'} size={30} />
            </Animated.View>
          ) : (
            customIcon()
          )}
          {isRTL && !I18nManager.isRTL && customTitle()}
        </View>
      </Pressable>
      {showContent && customBody()}
    </View>
  )
}
export default AccordionItem
