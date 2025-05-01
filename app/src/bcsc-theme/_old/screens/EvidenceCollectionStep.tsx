import { ButtonLocation, IconButton, testIdWithKey } from '@bifold/core'
import { HeaderBackButton, HeaderBackButtonProps } from '@react-navigation/elements'
import { useNavigation } from '@react-navigation/native'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import BirthdateContent from '../contents/EvidenceCollectionStep/Birthdate'
import ChooseContent from '../contents/EvidenceCollectionStep/Choose'
import InstructionsContent from '../contents/EvidenceCollectionStep/Instructions'
import ManualSerialContent from '../contents/EvidenceCollectionStep/ManualSerial'
import ScanContent from '../contents/EvidenceCollectionStep/Scan'

const Stages = {
  Choose: 1,
  Instructions: 2,
  Scan: 3,
  ManualSerial: 4,
  Birthdate: 5,
} as const

const EvidenceCollectionStepScreen: React.FC = () => {
  const [stage, setStage] = useState(1)
  const navigation = useNavigation()
  const { t } = useTranslation()

  const StageNavOptionsMap = useMemo(
    () => ({
      1: {
        title: t('Screens.EvidenceCollectionStep.Stage1'),
        headerLeft: (props: HeaderBackButtonProps) => (
          <HeaderBackButton
            {...props}
            accessibilityLabel={t('Global.Back')}
            testID={testIdWithKey('Back')}
            onPress={() => navigation.goBack()}
          />
        ),
        headerRight: () => (
          <IconButton
            buttonLocation={ButtonLocation.Right}
            icon={'help-circle'}
            accessibilityLabel={t('PersonCredential.HelpLink')}
            testID={testIdWithKey('Help')}
            onPress={() => null}
          />
        ),
      },
      2: {
        title: t('Screens.EvidenceCollectionStep.Stage2'),
        headerLeft: (props: HeaderBackButtonProps) => (
          <HeaderBackButton
            {...props}
            accessibilityLabel={t('Global.Back')}
            testID={testIdWithKey('Back')}
            onPress={() => {
              navigation.setOptions(StageNavOptionsMap[1])
              setStage(1)
            }}
          />
        ),
        headerRight: () => (
          <IconButton
            buttonLocation={ButtonLocation.Right}
            icon={'help-circle'}
            accessibilityLabel={t('PersonCredential.HelpLink')}
            testID={testIdWithKey('Help')}
            onPress={() => null}
          />
        ),
      },
      3: {
        title: t('Screens.EvidenceCollectionStep.Stage3'),
        headerLeft: (props: HeaderBackButtonProps) => (
          <HeaderBackButton
            {...props}
            accessibilityLabel={t('Global.Back')}
            testID={testIdWithKey('Back')}
            onPress={() => {
              navigation.setOptions(StageNavOptionsMap[2])
              setStage(2)
            }}
          />
        ),
        headerRight: () => (
          <IconButton
            buttonLocation={ButtonLocation.Right}
            icon={'help-circle'}
            accessibilityLabel={t('PersonCredential.HelpLink')}
            testID={testIdWithKey('Help')}
            onPress={() => null}
          />
        ),
      },
      4: {
        title: t('Screens.EvidenceCollectionStep.Stage4'),
        headerLeft: (props: HeaderBackButtonProps) => (
          <HeaderBackButton
            {...props}
            accessibilityLabel={t('Global.Back')}
            testID={testIdWithKey('Back')}
            onPress={() => {
              navigation.setOptions(StageNavOptionsMap[2])
              setStage(2)
            }}
          />
        ),
        headerRight: () => (
          <IconButton
            buttonLocation={ButtonLocation.Right}
            icon={'help-circle'}
            accessibilityLabel={t('PersonCredential.HelpLink')}
            testID={testIdWithKey('Help')}
            onPress={() => null}
          />
        ),
      },
      5: {
        title: t('Screens.EvidenceCollectionStep.Stage5'),
        headerLeft: (props: HeaderBackButtonProps) => (
          <HeaderBackButton
            {...props}
            accessibilityLabel={t('Global.Back')}
            testID={testIdWithKey('Back')}
            onPress={() => {
              navigation.setOptions(StageNavOptionsMap[4])
              setStage(4)
            }}
          />
        ),
        headerRight: () => (
          <IconButton
            buttonLocation={ButtonLocation.Right}
            icon={'help-circle'}
            accessibilityLabel={t('PersonCredential.HelpLink')}
            testID={testIdWithKey('Help')}
            onPress={() => null}
          />
        ),
      },
    }),
    [t, navigation]
  )

  const goToInstructions = useCallback(() => {
    setStage(2)
    navigation.setOptions(StageNavOptionsMap[2])
  }, [navigation, StageNavOptionsMap])

  const goToScan = useCallback(() => {
    setStage(3)
    navigation.setOptions(StageNavOptionsMap[3])
  }, [navigation, StageNavOptionsMap])

  const goToManualSerial = useCallback(() => {
    setStage(4)
    navigation.setOptions(StageNavOptionsMap[4])
  }, [navigation, StageNavOptionsMap])

  const goToBirthdate = useCallback(() => {
    setStage(5)
    navigation.setOptions(StageNavOptionsMap[5])
  }, [navigation, StageNavOptionsMap])

  const onComplete = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  if (stage === Stages.Choose) {
    return <ChooseContent goToInstructions={goToInstructions} />
  }

  if (stage === Stages.Instructions) {
    return <InstructionsContent goToScan={goToScan} goToManualSerial={goToManualSerial} />
  }

  if (stage === Stages.Scan) {
    return <ScanContent goToBirthdate={goToBirthdate} />
  }

  if (stage === Stages.ManualSerial) {
    return <ManualSerialContent goToBirthdate={goToBirthdate} />
  }

  return <BirthdateContent onComplete={onComplete} />
}

export default EvidenceCollectionStepScreen
