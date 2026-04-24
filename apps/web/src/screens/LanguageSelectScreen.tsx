import type { Language } from '../types'
import { APP_NAME, MASCOT_NAME, NATIVE_LANGUAGE, LANGUAGES } from '../data/languages'
import { mochiMain } from '../assets'

interface Props {
  onSelect: (learning: Language) => void
}

export default function LanguageSelectScreen({ onSelect }: Props) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src={mochiMain}
            alt={MASCOT_NAME}
            width={120}
            height={120}
            style={{ margin: '0 auto 1rem' }}
          />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Welcome to {APP_NAME}!
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
            {MASCOT_NAME} will guide your journey 🦔
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Learning from {NATIVE_LANGUAGE.flag} {NATIVE_LANGUAGE.name}
          </p>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          What do you want to learn?
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          You are learning from {NATIVE_LANGUAGE.flag} {NATIVE_LANGUAGE.name}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => lang.available && onSelect(lang)}
            style={{
              padding: '1.25rem 1rem',
              borderRadius: '0.75rem',
              border: '2px solid #e5e7eb',
              background: lang.available ? 'white' : '#f9fafb',
              cursor: lang.available ? 'pointer' : 'not-allowed',
              opacity: lang.available ? 1 : 0.5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (lang.available) e.currentTarget.style.borderColor = '#58cc02'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb'
            }}
          >
            <span style={{ fontSize: '2.5rem' }}>{lang.flag}</span>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{lang.name}</span>
            {!lang.available && (
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#9ca3af',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Coming soon
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
