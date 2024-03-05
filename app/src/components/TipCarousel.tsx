import { useTheme } from '@hyperledger/aries-bifold-core'
import React, { FunctionComponent, PropsWithChildren, memo, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View, Text, useWindowDimensions, FlatList, ListRenderItem, AccessibilityInfo } from 'react-native'

// used for randomizng tip order
const shuffleArray = (arr: number[]) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = arr[i]
    arr[i] = arr[j]
    arr[j] = temp
  }

  return arr
}

// increase / decrease the count in this array if you remove or add tips from the i18n files
const tipOrder: number[] = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])

interface TipItem {
  id: string
  showHeader: boolean
  text: string
}

export interface TipProps extends PropsWithChildren {
  item: TipItem
  width: number
  header: string
}

// memo used here to optimize for FlatList rendering
const Comp: FunctionComponent<TipProps> = ({ item, width, header }) => {
  const { TextTheme, ColorPallet } = useTheme()
  // not making use of useTheme here to optimize FlatList rendering
  const tipStyles = StyleSheet.create({
    tipContainer: {
      paddingHorizontal: 20,
      height: '100%',
      width,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tipHeaderContainer: {
      borderBottomWidth: 1,
      borderBottomColor: ColorPallet.brand.highlight,
    },
    tipHeader: {
      paddingBottom: 3,
      fontSize: 26,
      fontFamily: 'BCSans-Regular',
      fontWeight: 'bold',
      color: TextTheme.title.color,
    },
    tipText: {
      fontSize: 26,
      fontFamily: 'BCSans-Regular',
      fontWeight: 'bold',
      color: TextTheme.title.color,
      marginTop: 10,
      textAlign: 'center',
    },
  })

  return (
    <View style={tipStyles.tipContainer}>
      {item.showHeader && (
        <View style={tipStyles.tipHeaderContainer}>
          <Text adjustsFontSizeToFit style={tipStyles.tipHeader}>
            {header}
          </Text>
        </View>
      )}
      <Text adjustsFontSizeToFit style={tipStyles.tipText}>
        {item.text}
      </Text>
    </View>
  )
}

const Tip = memo<TipProps>(Comp)
const TipCarousel = () => {
  const flatListRef = useRef<FlatList>(null)
  const { width } = useWindowDimensions()
  const [currentPosition, setCurrentPosition] = useState(0)
  const { t } = useTranslation()
  const delay = 10000 // ms
  const tips = [
    {
      id: '0',
      showHeader: false,
      text: t('Tips.GettingReady'),
    },
    ...tipOrder.map((num, index) => {
      return {
        id: `${index + 1}`,
        showHeader: true,
        text: t(`Tips.Tip${num}`),
      }
    }),
  ]

  const scrolling = () => {
    if (flatListRef.current) {
      const newOffset = (currentPosition + 1) * width
      const maxOffset = tips.length * width
      if (newOffset >= maxOffset) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: false })
        setCurrentPosition(0)
      } else {
        flatListRef.current.scrollToOffset({ offset: newOffset, animated: true })
        setCurrentPosition(currentPosition + 1)
      }
    }
  }

  // ref used here to prevent interval from using old (initial) state values
  const callbackRef = useRef(scrolling)
  useEffect(() => {
    callbackRef.current = scrolling
  }, [scrolling])

  useEffect(() => {
    const timer = setInterval(() => callbackRef.current(), delay)
    return () => {
      if (timer) {
        clearInterval(timer)
      }
    }
  }, [])

  useEffect(() => {
    // Function to announce the current item to VoiceOver
    const currentTip = tipOrder[currentPosition - 1]
    if (currentTip) {
      const tipBody = t(`Tips.Tip${tipOrder[currentPosition - 1]}`)
      const tipHeader = t('Tips.Header')
      AccessibilityInfo.announceForAccessibility(`${tipHeader}, ${tipBody}`)
    } else if (currentPosition === 0) {
      AccessibilityInfo.announceForAccessibility(t('Tips.GettingReady'))
    }
  }, [currentPosition])

  // translating once here to prevent many repeated translations for each tip item
  const tipHeader = t('Tips.Header')
  const keyExtractor = (item: TipItem) => item.id
  const renderItem: ListRenderItem<TipItem> = ({ item }) => {
    return <Tip item={item} width={width} header={tipHeader} />
  }

  return (
    <FlatList
      ref={flatListRef}
      data={tips}
      getItemLayout={(_, index) => ({
        length: tips.length,
        offset: width * index,
        index,
      })}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEnabled={false}
    />
  )
}

export default TipCarousel
