import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useSavedServices } from '@/bcsc-theme/storage/hooks'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type ServiceBookmarkButtonProps = {
  serviceId: string
}

const ServiceBookmarkButton = ({ serviceId }: ServiceBookmarkButtonProps) => {
  const { ColorPalette, Spacing, TextTheme } = useTheme()
  const { ids: savedServiceIds } = useSavedServices()
  const { t } = useTranslation()
  const { updateSavedService } = useSecureActions()

  const styles = StyleSheet.create({
    button: {
      marginTop: Spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
      padding: Spacing.md,
      borderWidth: 2,
      borderColor: ColorPalette.brand.primary,
      borderRadius: Spacing.xs,
    },
  })

  const bookmarked = useMemo(() => {
    return savedServiceIds.includes(serviceId)
  }, [savedServiceIds, serviceId])

  const handleBookmarkPress = useCallback(() => {
    void updateSavedService(serviceId, !bookmarked)
  }, [serviceId, bookmarked, updateSavedService])

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleBookmarkPress}
      accessibilityRole="button"
      accessibilityState={{ selected: bookmarked }}
      accessibilityLabel={t('BCSC.ManualPairing.BookmarkServiceButton')}
      testID={testIdWithKey(TestIds.main.pairing.bookmark)}
    >
      <ThemedText variant={'bold'} style={{ color: TextTheme.headingFour.color, flexShrink: 1 }}>
        {t('BCSC.ManualPairing.BookmarkServiceButton')}
      </ThemedText>
      <Icon size={32} color={TextTheme.headingFour.color} name={bookmarked ? 'bookmark' : 'bookmark-outline'} />
    </TouchableOpacity>
  )
}

export default ServiceBookmarkButton
