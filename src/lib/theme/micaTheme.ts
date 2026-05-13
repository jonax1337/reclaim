import { webDarkTheme, webLightTheme, type Theme } from '@fluentui/react-components';

/**
 * Fluent 2 themes for the Mica window. We deliberately keep `colorNeutralBackground1`
 * at its opaque default so Dialogs, cards, menus etc. render solid (Win11-Settings
 * style). Window-chrome transparency is achieved by setting `background: transparent`
 * directly on the FluentProvider container and the NavDrawer surface (Background4).
 */
export const micaDarkTheme: Theme = {
  ...webDarkTheme,
  colorNeutralBackground4: 'transparent',
  colorSubtleBackground: 'transparent',
  colorSubtleBackgroundHover: 'rgba(255,255,255,0.045)',
  colorSubtleBackgroundPressed: 'rgba(255,255,255,0.07)',
  colorSubtleBackgroundSelected: 'rgba(255,255,255,0.06)',
  // Win11 Communication-Blue accent — overrides Fluent default brand.
  colorBrandBackground: '#4cc2ff',
  colorBrandBackgroundHover: '#60cdff',
  colorBrandBackgroundPressed: '#0078d4',
  colorBrandForeground1: '#60cdff',
  colorBrandForeground2: '#99ebff',
  colorCompoundBrandBackground: '#4cc2ff',
  colorCompoundBrandBackgroundHover: '#60cdff',
  colorCompoundBrandBackgroundPressed: '#0078d4',
  colorCompoundBrandForeground1: '#60cdff'
};

export const micaLightTheme: Theme = {
  ...webLightTheme,
  colorNeutralBackground4: 'transparent',
  colorSubtleBackground: 'transparent',
  colorSubtleBackgroundHover: 'rgba(0,0,0,0.045)',
  colorSubtleBackgroundPressed: 'rgba(0,0,0,0.07)',
  colorSubtleBackgroundSelected: 'rgba(0,0,0,0.06)',
  colorBrandBackground: '#0078d4',
  colorBrandBackgroundHover: '#006cbf',
  colorBrandBackgroundPressed: '#005a9e',
  colorBrandForeground1: '#005fb8',
  colorCompoundBrandBackground: '#0078d4',
  colorCompoundBrandBackgroundHover: '#006cbf',
  colorCompoundBrandBackgroundPressed: '#005a9e',
  colorCompoundBrandForeground1: '#005fb8'
};
