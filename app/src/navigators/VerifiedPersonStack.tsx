import {
  ButtonLocation,
  IconButton,
  testIdWithKey,
  useDefaultStackOptions,
  useTheme,
} from '@hyperledger/aries-bifold-core'
import { createStackNavigator } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import ChooseID from '../screens/ChooseID'
import VerificationSteps from '../screens/VerificationSteps'

import { BCScreens, BCVerifiedPersonStackParams } from './navigators'

const VerifiedPersonStack: React.FC = () => {
  const Stack = createStackNavigator<BCVerifiedPersonStackParams>()
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)
  const { t } = useTranslation()

  return (
    <Stack.Navigator screenOptions={{ ...defaultStackOptions }}>
      <Stack.Screen
        name={BCScreens.VerificationSteps}
        component={VerificationSteps}
        options={{
          title: t('Screens.VerificationSteps'),
          headerRight: () => (
            <IconButton
              buttonLocation={ButtonLocation.Right}
              icon={'help-circle'}
              accessibilityLabel={t('PersonCredential.HelpLink')}
              testID={testIdWithKey('Help')}
              onPress={() => null}
            />
          ),
        }}
      />
      <Stack.Screen
        name={BCScreens.ChooseID}
        component={ChooseID}
        options={{
          title: t('Screens.ChooseID'),
          headerRight: () => (
            <IconButton
              buttonLocation={ButtonLocation.Right}
              icon={'help-circle'}
              accessibilityLabel={t('PersonCredential.HelpLink')}
              testID={testIdWithKey('Help')}
              onPress={() => null}
            />
          ),
        }}
      />
    </Stack.Navigator>
  )
}

export default VerifiedPersonStack
