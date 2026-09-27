/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com
 */

import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

import { createVuetify, type ThemeDefinition } from 'vuetify'

const harborLight: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#F6F7F9',
    surface: '#FFFFFF',
    'on-background': '#1B1F24',
    'on-surface': '#1B1F24',
    primary: '#3949AB',
    secondary: '#5C6BC0',
    error: '#C62828',
    info: '#0277BD',
    success: '#2E7D32',
    warning: '#B26A00',
  },
  variables: {
    'border-color': '#1B1F24',
    'border-opacity': 0.12,
    'high-emphasis-opacity': 1,
    'medium-emphasis-opacity': 0.62,
  },
}

const harborDark: ThemeDefinition = {
  dark: true,
  colors: {
    background: '#121418',
    surface: '#1C1F26',
    'on-background': '#E6E8EC',
    'on-surface': '#E6E8EC',
    primary: '#8C9EFF',
    secondary: '#9FA8DA',
    error: '#EF5350',
    info: '#4FC3F7',
    success: '#66BB6A',
    warning: '#FFB74D',
  },
  variables: {
    'border-color': '#E6E8EC',
    'border-opacity': 0.14,
    'high-emphasis-opacity': 1,
    'medium-emphasis-opacity': 0.66,
  },
}

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  theme: {
    defaultTheme: 'harborLight',
    themes: {
      harborLight,
      harborDark,
    },
  },
  defaults: {
    VTextField: { variant: 'outlined', density: 'comfortable' },
  },
})
