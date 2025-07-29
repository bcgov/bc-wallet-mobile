import { hitSlop } from '@/constants'
import { BCDispatchAction, BCState } from '@/store'
import { ThemedText, useStore, useTheme } from '@bifold/core'
import { useCallback, useMemo } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type ServiceBookmarkButtonProps = {
  serviceName: string
  serviceId: string
}

const ServiceBookmarkButton = ({ serviceName, serviceId }: ServiceBookmarkButtonProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const [store, dispatch] = useStore<BCState>()

  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPalette.brand.secondaryBackground,
      padding: Spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  })

  const bookmarked = useMemo(() => {
    return store.bcsc.bookmarks.includes(serviceId)
  }, [store.bcsc.bookmarks, serviceId])

  const handleBookmarkPress = useCallback(() => {
    if (bookmarked) {
      dispatch({ type: BCDispatchAction.REMOVE_BOOKMARK, payload: [serviceId] })
    } else {
      dispatch({ type: BCDispatchAction.ADD_BOOKMARK, payload: [serviceId] })
    }
  }, [dispatch, serviceId, bookmarked])

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View>
          <ThemedText variant={'bold'}>Save link to:</ThemedText>
          <ThemedText variant={'bold'}>{serviceName}</ThemedText>
        </View>
        <TouchableOpacity hitSlop={hitSlop} onPress={handleBookmarkPress}>
          <Icon size={32} color={ColorPalette.brand.icon} name={bookmarked ? 'bookmark' : 'bookmark-outline'} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default ServiceBookmarkButton
