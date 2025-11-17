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
const createTermsOfUseWebViewJavascriptInjection = (colorPalette: IColorPalette): string => {
  return `
    document.addEventListener('DOMContentLoaded', function() {
      const style = document.createElement('style');

      document.querySelectorAll('footer, header, nav[aria-label="breadcrumb"]').forEach(el => el.remove());
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
const createSecuringAppWebViewJavascriptInjection = (): string => {
  return `
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('footer, header, nav[aria-label="breadcrumb"]').forEach(el => el.remove());
    });
  `
}

export { createSecuringAppWebViewJavascriptInjection, createTermsOfUseWebViewJavascriptInjection }
