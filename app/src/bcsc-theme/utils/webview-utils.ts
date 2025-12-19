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

interface WebViewAccessibilityProps {
  injectedJavaScript: string
  textZoom: number | undefined
}

/**
 * Returns platform-specific accessibility props for WebView text scaling.
 * - iOS: Uses JavaScript injection to scale fonts
 * - Android: Uses the native textZoom prop
 *
 * @param platform - The current platform ('ios' or 'android')
 * @param fontScale - The device's current font scale multiplier from useWindowDimensions()
 * @param injectedJavascript - Optional custom JavaScript to inject (will be combined with accessibility script)
 * @returns WebView props for accessibility text scaling
 */
export const getWebViewAccessibilityProps = (
  platform: string,
  fontScale: number,
  injectedJavascript?: string,
): WebViewAccessibilityProps => {
  const accessibilityScript = platform === 'ios' ? createAccessibilityFontScalingScript(fontScale) : ''
  return {
    injectedJavaScript: injectedJavascript ? `${accessibilityScript}${injectedJavascript}` : accessibilityScript,
    textZoom: platform === 'android' ? Math.round(fontScale * 100) : undefined,
  }
}
