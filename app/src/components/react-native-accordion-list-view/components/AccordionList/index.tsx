import { testIdWithKey } from 'aries-bifold'
import React, { useState } from 'react'
import { FlatList } from 'react-native'

import { AccordionListProps } from '../../models/AccordionList'
import AccordionItem from '../AccordionItem'

const AccordionList = ({
  data,
  customTitle,
  customBody,
  customIcon = undefined,
  containerItemStyle = {},
  animationDuration = 300,
  isRTL = false,
  expandMultiple = false,
  ...props
}: AccordionListProps) => {
  const [currentlyOpen, setCurrentlyOpen] = useState<any>(null)
  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <AccordionItem
      containerStyle={containerItemStyle}
      customTitle={() => customTitle(item)}
      customBody={() => customBody(item)}
      customIcon={customIcon}
      animationDuration={animationDuration}
      isRTL={isRTL}
      isOpen={JSON.stringify(currentlyOpen) === JSON.stringify(item)}
      onPress={(status) => {
        if (status && !expandMultiple) {
          setCurrentlyOpen(item)
        }
      }}
      testID={testIdWithKey('AccordionItem' + index)}
    />
  )
  return <FlatList data={data} renderItem={renderItem} keyExtractor={(item, index) => index.toString()} {...props} />
}

export default AccordionList
