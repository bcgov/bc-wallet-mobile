import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCState } from '@/store'
import { testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type ServiceBookmarkButtonProps = {
  serviceName: string
  serviceId: string
}

const ServiceBookmarkButton = ({ serviceName, serviceId }: ServiceBookmarkButtonProps) => {
  const { ColorPalette, Spacing, TextTheme } = useTheme()
  const [store] = useStore<BCState>()
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
    return store.bcscSecure.savedServices.includes(serviceId)
  }, [store.bcscSecure.savedServices, serviceId])

  const handleBookmarkPress = useCallback(() => {
    updateSavedService(serviceId, !bookmarked, { clientName: serviceName })
  }, [serviceId, bookmarked, serviceName, updateSavedService])

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleBookmarkPress}
      accessibilityRole="button"
      accessibilityState={{ selected: bookmarked }}
      accessibilityLabel={t('BCSC.ManualPairing.BookmarkServiceButton')}
      testID={testIdWithKey('BookmarkService')}
    >
      <ThemedText variant={'bold'} style={{ color: TextTheme.headingFour.color }}>
        {t('BCSC.ManualPairing.BookmarkServiceButton')}
      </ThemedText>
      <Icon size={32} color={TextTheme.headingFour.color} name={bookmarked ? 'bookmark' : 'bookmark-outline'} />
    </TouchableOpacity>
  )
}

export default ServiceBookmarkButton
