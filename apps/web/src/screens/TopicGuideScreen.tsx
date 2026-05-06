import type { GuideExample, GuideSection, Topic } from '../types'
import './TopicGuideScreen.css'

interface Props {
  topic: Topic
  onBack: () => void
}

export default function TopicGuideScreen({ topic, onBack }: Props) {
  // Render guard — the parent already checks topic.guide, but this keeps the
  // type narrow throughout the component.
  if (!topic.guide) return null
  const { intro, sections } = topic.guide

  return (
    <div className="guide-shell">
      <header className="guide-topbar" data-theme={topic.theme}>
        <button
          type="button"
          className="guide-back"
          onClick={onBack}
          aria-label="Back"
        >
          ←
        </button>
        <div className="guide-topbar-title">
          <div className="guide-topbar-eyebrow">Notes</div>
          <div className="guide-topbar-name">{topic.title}</div>
        </div>
      </header>

      <article className="guide-article">
        {intro && <p className="guide-intro">{intro}</p>}
        {sections.map((s, i) => (
          <Section key={i} section={s} />
        ))}

        <button
          type="button"
          className="ledge-button tone-primary size-lg guide-cta"
          onClick={onBack}
        >
          Back to lessons
        </button>
      </article>
    </div>
  )
}

function Section({ section }: { section: GuideSection }) {
  switch (section.kind) {
    case 'heading':
      return <h3 className="guide-heading">{section.text}</h3>
    case 'paragraph':
      return <p className="guide-paragraph">{section.text}</p>
    case 'list':
      return (
        <ul className="guide-list">
          {section.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      )
    case 'examples':
      return <ExamplesBlock rows={section.rows} />
    case 'callout':
      return (
        <aside className={'guide-callout tone-' + (section.tone ?? 'note')}>
          <span className="guide-callout-icon" aria-hidden="true">
            {section.tone === 'warn'
              ? '⚠️'
              : section.tone === 'tip'
                ? '💡'
                : '📌'}
          </span>
          <p>{section.text}</p>
        </aside>
      )
    case 'table':
      return (
        <div className="guide-table-wrap">
          <table className="guide-table">
            <thead>
              <tr>
                {section.headers.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
  }
}

function ExamplesBlock({ rows }: { rows: GuideExample[] }) {
  return (
    <div className="guide-examples">
      {rows.map((r, i) => (
        <div className="guide-example" key={i}>
          <div className="guide-example-source">{r.source}</div>
          {r.pinyin && <div className="guide-example-pinyin">{r.pinyin}</div>}
          <div className="guide-example-translation">{r.translation}</div>
        </div>
      ))}
    </div>
  )
}
