import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView } from 'react-native-gesture-handler'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import CardDetails from '@assets/img/card-details.svg'
import BulletPointWithText from '@/components/BulletPointWithText'

type AdditionalIdentificationRequiredScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.AdditionalIdentificationRequired>
}

const AdditionalIdentificationRequiredScreen: React.FC<AdditionalIdentificationRequiredScreenProps> = ({
  navigation,
}: AdditionalIdentificationRequiredScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    scrollView: {
      flex: 1,
      padding: Spacing.lg,
    },
    controlsContainer: {
      margin: Spacing.md,
      marginTop: 'auto',
      position: 'relative',
    },
  })
  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View
          style={{
            backgroundColor: ColorPalette.grayscale.white,
            alignSelf: 'center',
            borderRadius: 12,
            padding: Spacing.sm,
            margin: Spacing.xl,
          }}
        >
          <CardDetails {...{ height: 100, width: 180 }} />
        </View>
        <View style={{ marginBottom: Spacing.lg }}>
          <ThemedText variant={'headingFour'}>
            {`You must provide additional ID because your BC Services Card doesn't have a photo on it.`}
          </ThemedText>
          <ThemedText>
            {`It's needed to verify your identity. You'll be asked to provide one or two government-issued IDs`}
          </ThemedText>
        </View>
        <View style={{ marginBottom: Spacing.lg }}>
          <ThemedText variant={'headingFour'}>{'Check your ID'}</ThemedText>
          <BulletPointWithText
            text={'Has the same name as on your BC Services Card'}
            iconColor={ColorPalette.brand.icon}
          />
          <BulletPointWithText text={'Has a recent photo'} iconColor={ColorPalette.brand.icon} iconSize={Spacing.sm} />
          <BulletPointWithText text={'Is not expired'} iconColor={ColorPalette.brand.icon} />
        </View>
        <View style={{ marginBottom: Spacing.lg }}>
          <View style={{ flexDirection: 'row' }}>
            <ThemedText variant={'headingFour'}>{'Limited access to services'}</ThemedText>
            <TouchableOpacity onPress={() => console.log('OPEN SO COOL WEBVIEW')}>
              <Icon color={ColorPalette.brand.primary} size={24} name={'open-in-new'} />
            </TouchableOpacity>
          </View>
          <ThemedText>{`Some services only accept the app when it's set up with a BC Services Card with a photo.`}</ThemedText>
        </View>
        <View style={{ marginTop: Spacing.md }}>
          <Button
            title={'Choose ID'}
            accessibilityLabel={'Choose ID'}
            testID={''}
            onPress={() => {
              navigation.navigate(BCSCScreens.EvidenceTypeList)
            }}
            buttonType={ButtonType.Primary}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default AdditionalIdentificationRequiredScreen
