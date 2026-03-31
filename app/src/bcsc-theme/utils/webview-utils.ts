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
 * Creates a CSS font-size value based on the device font scale.
 * iOS uses the fontScale, Android uses a fixed value of 1.
 * @param {number} fontScale - The device font scale (e.g. from useWindowDimensions().fontScale)
 * @returns {number} The CSS font-size value in pixels
 */
const createFontScalingCss = (fontScale: number): number => {
  const scale = Platform.OS === 'ios' ? fontScale : 1
  return Math.round(16 * scale)
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
