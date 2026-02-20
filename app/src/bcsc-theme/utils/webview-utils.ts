import { IColorPalette } from '@bifold/core'
import { Dimensions, Platform } from 'react-native'

export const createFontScalingScript = (): string => {
  const fontScale = Dimensions.get('window').fontScale
  if (Platform.OS === 'ios') {
    return `
      const fontScale = ${fontScale};
      document.documentElement.style.fontSize = (16 * fontScale) + 'px';
      document.body.style.fontSize = (16 * fontScale) + 'px';
    `
  }

  return ''
}

/**
 * Creates webview javascript injection to modify the HTML content.
 *
 * This includes setting the background color, text color, and link colors to match the app theme.
 * It also removes nav sections from the page.
 *
 * @param {IColorPalette} colorPalette - The color palette object containing brand colors
 * @returns {*} {string} JavaScript string to be injected into the WebView
 */
export const createWebViewJavascriptInjection = (colorPalette: IColorPalette): string => {
  return `
    document.addEventListener('DOMContentLoaded', function() {
      ${createFontScalingScript()}
      document.querySelectorAll('footer, header, h1, nav[aria-label="breadcrumb"]').forEach(el => el.remove());
      document.body.style.backgroundColor = '${colorPalette.brand.primaryBackground}';
      document.body.style.color = '${colorPalette.brand.secondary}';

      const style = document.createElement('style');
      style.textContent = \`
        body, body * {
          background-color: ${colorPalette.brand.primaryBackground} !important;
          color: ${colorPalette.brand.secondary} !important;
        }
        a, a *, a:visited, a:visited *, a:hover, a:hover *, a:active, a:active * {
          color: ${colorPalette.brand.link} !important;
          text-decoration-color: ${colorPalette.brand.link} !important;
          border-color: ${colorPalette.brand.link} !important;
        }
      \`;
      document.head.appendChild(style);
      document.querySelectorAll('a').forEach(el => {
        el.style.setProperty('color', '${colorPalette.brand.link}', 'important');
        el.style.setProperty('text-decoration-color', '${colorPalette.brand.link}', 'important');
        el.style.setProperty('border-color', '${colorPalette.brand.link}', 'important');
      });
    });
  `
}
