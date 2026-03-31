import React from 'react'
import { WebViewContent } from './WebViewContent'

interface WebViewScreenProps {
  route: { params: { url: string } }
}

/**
 * Generic WebView screen component used by all navigation stacks.
 * Route param type safety is enforced by each stack's param list, not here.
 */
export const WebViewScreen: React.FC<WebViewScreenProps> = ({ route }) => {
  return <WebViewContent url={route.params.url} />
}
