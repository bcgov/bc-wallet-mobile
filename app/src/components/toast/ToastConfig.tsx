import { GenericFn } from '@hyperledger/aries-bifold-core'
import React from 'react'
import { ToastShowParams } from 'react-native-toast-message'

import BaseToast, { ToastType } from './BaseToast'

interface CustomToastParams extends ToastShowParams {
  onCancel?: GenericFn
}

export const Config = {
  success: (props: CustomToastParams) => (
    <BaseToast title={props?.text1} body={props?.text2} onPress={props?.onPress} toastType={ToastType.Success} />
  ),
  warn: (props: CustomToastParams) => (
    <BaseToast title={props?.text1} body={props?.text2} toastType={ToastType.Warn} onPress={props?.onPress} />
  ),
  error: (props: CustomToastParams) => (
    <BaseToast title={props?.text1} body={props?.text2} toastType={ToastType.Error} onPress={props?.onPress} />
  ),
  info: ({ text1, text2, onPress, props }: CustomToastParams) => {
    return (
      <BaseToast title={text1} body={text2} toastType={ToastType.Info} onPress={onPress} onCancel={props?.onCancel} />
    )
  },
}

export default Config
