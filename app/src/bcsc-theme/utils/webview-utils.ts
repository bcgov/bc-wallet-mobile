import { IColorPalette } from '@bifold/core'
import { Platform } from 'react-native'
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
 * Strips outer document tags (<html>, <head>, <body> and their closing tags) from HTML content,
 * leaving only the inner body content. This prevents invalid nested HTML when wrapping
 * API-returned HTML in our own document structure.
 */
const stripOuterDocumentTags = (html: string): string => {
  return html
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<\/?head[^>]*>/gi, '')
    .replace(/<\/?body[^>]*>/gi, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .trim()
}

/**
 * Creates a CSS fragment that applies font scaling to the document.
 * Only runs on iOS (Android uses the WebView textZoom prop). Returns empty string if
 * baseFontSizePx is invalid (<= 0) to avoid injecting a zero or negative font size.
 */
const createFontScalingCss = (fontScale: number): number => {
  const baseFontSizePx = fontScale > 0 ? Math.round(16 * fontScale) : 16
  const applyFontScaling = Platform.OS === 'ios' && baseFontSizePx > 0
  return applyFontScaling ? baseFontSizePx : 0
}

export interface TermsOfUseHtmlOptions {
  termsOfUse: TermsOfUseResponseData
  colorPalette: IColorPalette
  headerText: string
  subtitlePrefix: string
  versionLabel: string
}

/**
 * Creates a well-formed HTML document for the Terms of Use, matching v3 (ias-ios) layout.
 * Embeds all styling directly in the HTML so it works reliably on both iOS and Android
 * without relying on JS injection timing.
 *
 * Header includes:
 * - Bold header text (from i18n)
 * - Subtitle with version and formatted date (from i18n)
 *
 * @param {TermsOfUseHtmlOptions} options - The terms data, color palette, and i18n strings
 * @param {number} fontScale - The device font scale (e.g. from useWindowDimensions().fontScale)
 * @returns {string} A complete HTML document string
 */
export const createTermsOfUseHtml = (options: TermsOfUseHtmlOptions, fontScale: number): string => {
  const { termsOfUse, colorPalette, headerText, subtitlePrefix, versionLabel } = options
  const formattedDate = formatLongDate(termsOfUse.date)
  const bodyContent = stripOuterDocumentTags(termsOfUse.html)
  const fontSizeCss = createFontScalingCss(fontScale)
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">  
<style>
  body {
    background-color: ${colorPalette.brand.primaryBackground};
    color: ${colorPalette.brand.secondary};
    font-family: -apple-system, system-ui, sans-serif;
    font-size: ${fontSizeCss}px !important;
    padding: 0 16px 16px 16px;
    line-height: 1.6;
    margin: 0;
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
</head>
<body>
<h4>${headerText}</h4>
<p>${subtitlePrefix}<br/>${versionLabel} ${termsOfUse.version}, ${formattedDate}</p>
${bodyContent}
</body>
</html>`
}

/**
 * Returns a script fragment that applies iOS font scaling (Dynamic Type) to the document.
 * Only runs on iOS (Android uses the WebView textZoom prop). Returns empty string if
 * baseFontSizePx is invalid (<= 0) to avoid injecting a zero or negative font size.
 *
 * Sets font-size on html, body, and all body descendants so that elements with explicit
 * font-sizes from the page's own CSS (e.g. intro paragraphs) are overridden.
 */
export const createFontScalingScript = (baseFontSizePx: number): string => {
  if (Platform.OS !== 'ios' || baseFontSizePx <= 0) {
    return ''
  }
  return `
      const baseFontSizePx = ${baseFontSizePx};
      document.documentElement.style.setProperty('font-size', baseFontSizePx + 'px', 'important');
      if (document.body) document.body.style.setProperty('font-size', baseFontSizePx + 'px', 'important');
      var fontStyle = document.createElement('style');
      fontStyle.textContent = 'html, body, body * { font-size: ' + baseFontSizePx + 'px !important; }';
      document.head.appendChild(fontStyle);
    `
}

/**
 * Creates webview javascript injection to modify the HTML content loaded from a full web page URL.
 *
 * This includes applying iOS font scaling (Android uses WebView textZoom), setting the background
 * color, text color, and link colors to match the app theme, and removing page chrome.
 *
 * @param colorPalette - The color palette object containing brand colors
 * @param fontScale - Device font scale (e.g. from useWindowDimensions().fontScale)
 */
export const createWebViewJavascriptInjection = (colorPalette: IColorPalette, fontScale: number): string => {
  const fontSizeCss = createFontScalingCss(fontScale)
  return `
    document.addEventListener('DOMContentLoaded', function() {
      ${createFontScalingScript(fontSizeCss)}
      document.querySelectorAll('footer, header, h1, nav[aria-label="breadcrumb"]').forEach(el => el.remove());
      document.body.style.backgroundColor = '${colorPalette.brand.primaryBackground}';
      document.body.style.color = '${colorPalette.brand.secondary}';

      const style = document.createElement('style');
      style.textContent = \`
        html, body, body * {
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
