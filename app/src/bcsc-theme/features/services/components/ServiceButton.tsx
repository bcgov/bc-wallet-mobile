import { ListButton, ListButtonProps } from '@/bcsc-theme/components/ListButton'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { hitSlop } from '@/constants'
import { BCState } from '@/store'
import { testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { a11yLabel } from '@utils/accessibility'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

interface ServiceButtonProps {
  clientRefId: string
  title: string
  description?: string
  onPress: () => void
  testID?: string
  /** Injected by ListButtonGroup to control border radius */
  position?: ListButtonProps['position']
}

const ServiceButton: React.FC<ServiceButtonProps> = ({
  clientRefId,
  title,
  description,
  onPress,
  testID,
  position,
}) => {
  const { ColorPalette, Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { updateSavedService } = useSecureActions()

  const isBookmarked = store.bcscSecure.savedServices.includes(clientRefId)

  const styles = StyleSheet.create({
    contentContainer: {
      flex: 1,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    title: {
      flex: 1,
      color: ColorPalette.brand.primary,
    },
  })

  const handleToggleBookmark = () => {
    updateSavedService(clientRefId, !isBookmarked, { clientName: title })
  }

  return (
    <ListButton onPress={onPress} position={position} accessibilityLabel={a11yLabel(title)}>
      <View style={styles.contentContainer}>
        <View style={styles.topRow}>
          <ThemedText
            variant={'bold'}
            style={styles.title}
            testID={testID ?? testIdWithKey(`ServiceButton-${title.replaceAll(/\s+/g, '')}`)}
          >
            {title}
          </ThemedText>
          <Pressable
            onPress={handleToggleBookmark}
            hitSlop={hitSlop}
            accessibilityRole={'button'}
            accessibilityLabel={a11yLabel(`Toggle bookmark for ${title}`)}
            testID={testIdWithKey(`ServiceButton-Bookmark-${title.replaceAll(/\s+/g, '')}`)}
          >
            <Icon name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={24} color={ColorPalette.brand.primary} />
          </Pressable>
        </View>
        {description ? (
          <ThemedText variant={'caption'} style={{ marginTop: Spacing.sm }}>
            {description}
          </ThemedText>
        ) : null}
      </View>
    </ListButton>
  )
}

export default ServiceButton
