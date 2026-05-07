import type { Language } from '@mochilang/shared'
import { APP_NAME, MASCOT_NAME, NATIVE_LANGUAGE, LANGUAGES } from '../data/languages'
import { mochiMain } from '../assets'
import './LanguageSelectScreen.css'

interface Props {
  onSelect: (learning: Language) => void
}

export default function LanguageSelectScreen({ onSelect }: Props) {
  return (
    <div className="lang-shell">
      <div className="lang-hero">
        <img src={mochiMain} alt={MASCOT_NAME} className="lang-mochi" />
        <h1 className="lang-title">Welcome to {APP_NAME}</h1>
        <p className="lang-tagline">
          {MASCOT_NAME} the hedgehog will guide your journey.
        </p>
        <div className="lang-from">
          Learning from <strong>{NATIVE_LANGUAGE.flag} {NATIVE_LANGUAGE.name}</strong>
        </div>
      </div>

      <div className="lang-pickHeader">
        <h2>What do you want to learn?</h2>
      </div>

      <div className="lang-grid">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            className={
              'lang-card ' + (lang.available ? '' : 'lang-card-disabled')
            }
            disabled={!lang.available}
            onClick={() => lang.available && onSelect(lang)}
          >
            <span className="lang-card-flag">{lang.flag}</span>
            <span className="lang-card-name">{lang.name}</span>
            {!lang.available && (
              <span className="lang-card-soon">Coming soon</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
