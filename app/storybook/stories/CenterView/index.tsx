import React, { PropsWithChildren } from 'react'
import { StyleSheet, View } from 'react-native'

interface Props extends PropsWithChildren {}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
})

export const CenterView = (props: Props) => {
  return <View style={styles.main}>{props.children}</View>
}
