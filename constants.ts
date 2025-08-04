
import { Language } from './types';

// This constant is no longer used as the app is hardcoded to Spanish.
// It is kept here as a reference in case language selection is re-introduced.
export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'es-ES', name: 'Español' },
  { code: 'en-US', name: 'Inglés' },
  { code: 'fr-FR', name: 'Francés' },
  { code: 'de-DE', name: 'Alemán' },
  { code: 'it-IT', name: 'Italiano' },
  { code: 'pt-BR', name: 'Portugués (Brasil)' },
  { code: 'ja-JP', name: 'Japonés' },
  { code: 'ko-KR', name: 'Coreano' },
  { code: 'zh-CN', name: 'Chino (Mandarín)' },
  { code: 'ru-RU', name: 'Ruso' },
  { code: 'ar-SA', name: 'Árabe' },
  { code: 'hi-IN', name: 'Hindi' },
];
