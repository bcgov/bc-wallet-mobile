import { BCSCScreens, BCSCVerifyIdentityStackParams } from "@/bcsc-theme/types/navigators";
import { BCDispatchAction, BCState } from "@/store";
import { useTheme, Button, ButtonType, testIdWithKey, useStore } from "@bifold/core";
import { CommonActions } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Image, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type PhotoReviewScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.PhotoReview>
  route: {
    params: {
      photoPath: string;
    };
  };
}

const PhotoReviewScreen = ({ navigation, route }: PhotoReviewScreenProps) => {
  const { ColorPallet, Spacing } = useTheme()
  const [, dispatch] = useStore<BCState>()
  const { photoPath } = route.params

  if (!photoPath) {
    throw new Error('Photo path is required')
  }

  const styles = StyleSheet.create({
    pageContainer: {
      position: 'relative',
      flexGrow: 1,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    contentContainer: {
      flexGrow: 1,
    },
    controlsContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: Spacing.md,
    },
    secondButton: {
      marginTop: Spacing.sm,
    },
  })

  const onPressUse = () => {
    dispatch({ type: BCDispatchAction.SAVE_PHOTO, payload: [photoPath] })
    navigation.dispatch(CommonActions.reset({ index: 2, routes: [{ name: BCSCScreens.SetupSteps }, { name: BCSCScreens.VerificationMethodSelection }, { name: BCSCScreens.InformationRequired }] }))
  }

  const onPressRetake = () => {
    navigation.goBack()
  }

  return (
    <SafeAreaView style={styles.pageContainer}>
      <View style={styles.contentContainer}>
        <Image
          source={{ uri: photoPath }}
          style={{ height: '100%', width: 'auto', resizeMode: 'cover' }}
        />
        <View style={styles.controlsContainer}>
          <Button
            buttonType={ButtonType.Primary}
            onPress={onPressUse}
            testID={testIdWithKey('UsePhoto')}
            title={'Use this photo'}
            accessibilityLabel={'Use this photo'}
          />
          <View style={styles.secondButton}>
            <Button
              buttonType={ButtonType.Tertiary}
              onPress={onPressRetake}
              testID={testIdWithKey('RetakePhoto')}
              title={'Retake photo'}
              accessibilityLabel={'Retake photo'}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

export default PhotoReviewScreen;