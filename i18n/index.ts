import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import fr from './locales/fr.json';

const device = getLocales()[0];
const code = device?.languageCode ?? 'fr';
const initialLng = code.startsWith('en') ? 'en' : 'fr';

void i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: initialLng,
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

/** Langue courte pour l’UI (`fr` | `en`). */
export function resolveAppLang(): 'fr' | 'en' {
  return i18n.language.startsWith('en') ? 'en' : 'fr';
}

export { i18n };
