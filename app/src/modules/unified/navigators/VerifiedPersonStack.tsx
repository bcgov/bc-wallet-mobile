import {
  ButtonLocation,
  IconButton,
  testIdWithKey,
  useDefaultStackOptions,
  useTheme,
} from '@hyperledger/aries-bifold-core'
import { createStackNavigator } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import VerificationStep1 from '../screens/VerificationStep1'
import VerificationStep2 from '../screens/VerificationStep2'
import VerificationStep3 from '../screens/VerificationStep3'
import VerificationStep4 from '../screens/VerificationStep4'
import VerificationSteps from '../screens/VerificationSteps'

import { BCScreens } from '../../../types/navigators'

export type BCVerifiedPersonStackParams = {
  [BCScreens.VerificationSteps]: undefined
  [BCScreens.VerificationStep1]: undefined
  [BCScreens.VerificationStep2]: undefined
  [BCScreens.VerificationStep3]: undefined
  [BCScreens.VerificationStep4]: undefined
}

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
        name={BCScreens.VerificationStep1}
        component={VerificationStep1}
        options={{
          title: t('Screens.VerificationStep1.Stage1'),
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
        name={BCScreens.VerificationStep2}
        component={VerificationStep2}
        options={{
          title: t('Screens.VerificationStep2.Stage1'),
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
        name={BCScreens.VerificationStep3}
        component={VerificationStep3}
        options={{
          title: t('Screens.VerificationStep3.Stage1'),
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
        name={BCScreens.VerificationStep4}
        component={VerificationStep4}
        options={{
          title: t('Screens.VerificationStep4.Stage1'),
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
