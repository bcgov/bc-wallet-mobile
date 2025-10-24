import { IColorPalette } from '@bifold/core'

/**
 * Creates injected JavaScript that applies theme colors to a WebView's content.
 * This includes setting the background color, text color, and link colors to match the app theme.
 * It also removes nav sections from the page
 *
 * @param colorPalette - The color palette object containing brand colors
 * @returns JavaScript string to be injected into the WebView
 */
export const createThemedWebViewScript = (colorPalette: IColorPalette): string => {
  return `
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('footer, header, nav[aria-label="breadcrumb"]').forEach(el => el.remove());
      document.body.style.backgroundColor = '${colorPalette.brand.primaryBackground}';
      document.body.style.color = '${colorPalette.brand.secondary}';
      document.querySelectorAll('a').forEach(link => {
        link.style.color = '${colorPalette.brand.link}';
      });
    });
  `
}
