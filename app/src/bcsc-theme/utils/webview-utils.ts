import { IColorPalette } from '@bifold/core'

/**
 * Creates "Terms of Use" webview javascript injection to modify the HTML content.
 *
 * This includes setting the background color, text color, and link colors to match the app theme.
 * It also removes nav sections from the page.
 *
 * @param {IColorPalette} colorPalette - The color palette object containing brand colors
 * @returns {*} {string} JavaScript string to be injected into the WebView
 */
export const createTermsOfUseWebViewJavascriptInjection = (colorPalette: IColorPalette): string => {
  return `
    document.addEventListener('DOMContentLoaded', function() {
      const style = document.createElement('style');

      document.querySelectorAll('footer, header, h1, nav[aria-label="breadcrumb"]').forEach(el => el.remove());
      document.body.style.backgroundColor = '${colorPalette.brand.primaryBackground}';
      document.body.style.color = '${colorPalette.brand.secondary}';

      style.textContent = \`
        a, a:visited, a:hover, a:active {
          color: ${colorPalette.brand.link};
          text-decoration: ${colorPalette.brand.link};
        }
      \`;

      document.head.appendChild(style);
    });
  `
}

/**
 * The "Securing this App" webview javascript injection to modify the HTML content.
 *
 * This is to remove the navigation sections from the page.
 *
 * @returns {*} {string} JavaScript string to be injected into the WebView
 */
export const createSecuringAppWebViewJavascriptInjection = (): string => {
  return `
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('footer, header, nav[aria-label="breadcrumb"]').forEach(el => el.remove());
    });
  `
}

/**
 * Creates JavaScript to apply accessibility font scaling on iOS.
 * This ensures web content respects the device's text size accessibility settings.
 *
 * @param fontScale - The device's current font scale multiplier from useWindowDimensions()
 * @returns JavaScript string to inject into the WebView
 */
export const createAccessibilityFontScalingScript = (fontScale: number): string => {
  return `
    (function() {
      const fontScale = ${fontScale};
      document.documentElement.style.fontSize = (16 * fontScale) + 'px';
      document.body.style.fontSize = (16 * fontScale) + 'px';
    })();
  `
}

/**
 * Combines accessibility font scaling script with any custom injected JavaScript for iOS.
 * Android uses the textZoom prop instead of JavaScript injection.
 *
 * @param platform - The current platform ('ios' or 'android')
 * @param fontScale - The device's current font scale multiplier from useWindowDimensions()
 * @param injectedJavascript - Optional custom JavaScript to inject
 * @returns Combined JavaScript string to inject into the WebView
 */
export const combineAccessibilityScriptWithInjectedJS = (
  platform: string,
  fontScale: number,
  injectedJavascript?: string
): string => {
  const accessibilityScript = platform === 'ios' ? createAccessibilityFontScalingScript(fontScale) : ''
  return injectedJavascript ? `${accessibilityScript}${injectedJavascript}` : accessibilityScript
}

/**
 * Calculates the Android textZoom value from the font scale.
 * Converts fontScale (e.g., 1.0, 1.5, 2.0) to percentage (100, 150, 200).
 *
 * @param platform - The current platform ('ios' or 'android')
 * @param fontScale - The device's current font scale multiplier from useWindowDimensions()
 * @returns The textZoom percentage for Android, or undefined for other platforms
 */
export const getAndroidTextZoom = (platform: string, fontScale: number): number | undefined => {
  return platform === 'android' ? Math.round(fontScale * 100) : undefined
}
