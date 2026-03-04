import { IColorPalette } from '@bifold/core'
import { Dimensions, Platform } from 'react-native'
import { TermsOfUseResponseData } from '../api/hooks/useConfigApi'

/**
 * Formats a date string (yyyy-MM-dd) to a long date format (e.g. "June 6, 2025").
 */
const formatLongDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * Creates the full Terms of Use HTML with a header block prepended, matching v3 (ias-ios) layout.
 * Embeds all styling directly in the HTML so it works reliably on both iOS and Android
 * without relying on JS injection timing.
 *
 * Header includes:
 * - Bold text: "Before you use the Service, you must read and accept the terms set out in this Agreement"
 * - Subtitle: "BC Login Service Terms of Use\nVersion {version}, {date}"
 *
 * @param {TermsOfUseResponseData} termsOfUse - The terms of use data from the API
 * @param {IColorPalette} colorPalette - The color palette for theming
 * @returns {string} Full HTML string with embedded styles, header, and terms body
 */
export const createTermsOfUseHtml = (termsOfUse: TermsOfUseResponseData, colorPalette: IColorPalette): string => {
  const formattedDate = formatLongDate(termsOfUse.date)
  return `<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body {
    background-color: ${colorPalette.brand.primaryBackground};
    color: ${colorPalette.brand.secondary};
    font-family: -apple-system, system-ui, sans-serif;
    font-size: 18px;
    padding: 0 16px 16px 16px;
    line-height: 1.6;
  }
  body, body * {
    background-color: ${colorPalette.brand.primaryBackground} !important;
    color: ${colorPalette.brand.secondary} !important;
  }
  p, li, dd, dt {
    margin-bottom: 0.75em;
  }
  a, a *, a:visited, a:visited *, a:hover, a:hover *, a:active, a:active * {
    color: ${colorPalette.brand.link} !important;
    text-decoration-color: ${colorPalette.brand.link} !important;
    border-color: ${colorPalette.brand.link} !important;
  }
</style>
<h4>Before you use the Service, you must read and accept the terms set out in this Agreement</h4>
<p>BC Login Service Terms of Use<br/>Version ${termsOfUse.version}, ${formattedDate}</p>
${termsOfUse.html}`
}

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
/**
 * Creates a themed style injection for raw HTML content (e.g. from the /v3/terms API).
 *
 * Unlike createWebViewJavascriptInjection, this does NOT strip page elements (header, footer, h1, nav)
 * since API HTML contains only the content body. It applies font scaling and theme colors.
 *
 * @param {IColorPalette} colorPalette - The color palette object containing brand colors
 * @returns {*} {string} JavaScript string to be injected into the WebView
 */
export const createHtmlContentInjection = (colorPalette: IColorPalette): string => {
  return `
    document.addEventListener('DOMContentLoaded', function() {
      document.body.style.backgroundColor = '${colorPalette.brand.primaryBackground}';
      document.body.style.color = '${colorPalette.brand.secondary}';
      document.body.style.fontFamily = '-apple-system, system-ui, sans-serif';
      document.body.style.fontSize = '18px';
      document.body.style.padding = '0 16px 16px 16px';
      document.body.style.lineHeight = '1.6';

      const style = document.createElement('style');
      style.textContent = \`
        body, body * {
          background-color: ${colorPalette.brand.primaryBackground} !important;
          color: ${colorPalette.brand.secondary} !important;
        }
        p, li, dd, dt {
          margin-bottom: 0.75em;
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

/**
 * Creates webview javascript injection to modify the HTML content loaded from a full web page URL.
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
