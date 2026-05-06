import './BottomNav.css'

export type Tab = 'home' | 'league' | 'friends' | 'profile'

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

interface TabDef {
  id: Tab
  label: string
  icon: React.ReactNode
}

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path {...stroke} d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2v-9z" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path {...stroke} d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6l8-3z" />
      <path {...stroke} d="M9 12l2 2 4-4" />
    </svg>
  )
}

function FriendsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <circle {...stroke} cx="9" cy="9" r="3.2" />
      <circle {...stroke} cx="17" cy="10.5" r="2.5" />
      <path {...stroke} d="M3 19a6 6 0 0 1 12 0" />
      <path {...stroke} d="M14.5 19a4.5 4.5 0 0 1 7 0" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <circle {...stroke} cx="12" cy="8.5" r="3.7" />
      <path {...stroke} d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  )
}

const TABS: TabDef[] = [
  { id: 'home', label: 'Learn', icon: <HomeIcon /> },
  { id: 'league', label: 'League', icon: <ShieldIcon /> },
  { id: 'friends', label: 'Friends', icon: <FriendsIcon /> },
  { id: 'profile', label: 'Profile', icon: <ProfileIcon /> },
]

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="bottomnav" aria-label="Main navigation">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={'bottomnav-tab ' + (tab.id === active ? 'is-active' : '')}
          onClick={() => onChange(tab.id)}
          aria-current={tab.id === active ? 'page' : undefined}
        >
          <span className="bottomnav-icon">{tab.icon}</span>
          <span className="bottomnav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
