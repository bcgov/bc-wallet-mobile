import {
  ButtonLocation,
  IconButton,
  testIdWithKey,
  useDefaultStackOptions,
  useTheme,
} from '@hyperledger/aries-bifold-core'
import { createStackNavigator } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'

import EvidenceCollectionStep from '../screens/EvidenceCollectionStep'
import ResidentialAddressStep from '../screens/ResidentialAddressStep'
import EmailStep from '../screens/EmailStep'
import VerifyIdentityStep from '../screens/VerifyIdentityStep'
import VerificationSteps from '../screens/VerificationSteps'
import { BCScreens } from '../../../types/navigators'

export type BCVerifiedPersonStackParams = {
  [BCScreens.VerificationSteps]: undefined
  [BCScreens.EvidenceCollectionStep]: undefined
  [BCScreens.ResidentialAddressStep]: undefined
  [BCScreens.EmailStep]: undefined
  [BCScreens.VerifyIdentityStep]: undefined
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
        name={BCScreens.EvidenceCollectionStep}
        component={EvidenceCollectionStep}
        options={{
          title: t('Screens.EvidenceCollectionStep.Stage1'),
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
        name={BCScreens.ResidentialAddressStep}
        component={ResidentialAddressStep}
        options={{
          title: t('Screens.ResidentialAddressStep.Stage1'),
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
        name={BCScreens.EmailStep}
        component={EmailStep}
        options={{
          title: t('Screens.EmailStep.Stage1'),
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
        name={BCScreens.VerifyIdentityStep}
        component={VerifyIdentityStep}
        options={{
          title: t('Screens.VerifyIdentityStep.Stage1'),
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
