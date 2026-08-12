import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { openLink } from '@/utils/links'
import { Button, ButtonType, ColorPalette, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { RouteProp, useRoute } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { BCSCScreens, BCSCVerifyStackParams } from '../../types/navigators'
import { DEVICE_AUTHORIZATION_ERROR_CONFIG } from './deviceAuthorizationError'

export { DeviceAuthorizationError } from './deviceAuthorizationError'

const DeviceAuthorizationErrorScreen = () => {
  const { Spacing, Buttons } = useTheme()
  const { t } = useTranslation()
  const { params } = useRoute<RouteProp<BCSCVerifyStackParams, BCSCScreens.DeviceAuthorizationError>>()

  const config = DEVICE_AUTHORIZATION_ERROR_CONFIG[params.errorType]

  const controls = (
    <ControlContainer>
      <Button
        title=""
        accessibilityLabel={t(config.buttonTextKey)}
        accessibilityHint={t('Global.A11y.OpensInBrowser')}
        testID={testIdWithKey('DeviceAuthorizationErrorLink')}
        buttonType={ButtonType.Primary}
        onPress={() => openLink(config.buttonUrl)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ThemedText style={Buttons.primaryText}>{t(config.buttonTextKey)}</ThemedText>
          <Icon name="open-in-new" size={20} color={ColorPalette.brand.headerText} style={{ marginLeft: Spacing.sm }} />
        </View>
      </Button>
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      padded={false}
      controls={config.buttonVisible ? controls : null}
      scrollViewContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}
    >
      <ThemedText variant={'headingThree'}>{t(config.headingKey)}</ThemedText>
      <ThemedText>{t(config.descriptionKey)}</ThemedText>
    </ScreenWrapper>
  )
}

export default DeviceAuthorizationErrorScreen
