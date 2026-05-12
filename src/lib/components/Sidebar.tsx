import { Icon } from './Icon';
import type { FluentIconName } from '../icons';
import type { ViewKey } from '../../types';
import './Sidebar.css';

const items: { key: ViewKey; label: string; icon: FluentIconName; group?: string }[] = [
  { key: 'dashboard',   label: 'Dashboard',  icon: 'LayoutDashboard', group: 'Overview' },
  { key: 'profiles',    label: 'Profiles',   icon: 'Sparkles' },
  { key: 'privacy',     label: 'Privacy',    icon: 'ShieldOff',  group: 'Tweaks' },
  { key: 'bloatware',   label: 'Bloatware',  icon: 'Trash2' },
  { key: 'ai',          label: 'AI Features',icon: 'Sparkles' },
  { key: 'explorer',    label: 'Explorer',   icon: 'FolderOpen' },
  { key: 'search',      label: 'Search',     icon: 'Search' },
  { key: 'performance', label: 'Performance',icon: 'Gauge' },
  { key: 'gaming',      label: 'Gaming',     icon: 'Gamepad2' },
  { key: 'services',    label: 'Services',   icon: 'Settings2' },
  { key: 'updates',     label: 'Windows Update', icon: 'RefreshCcw' },
  { key: 'group-policy',label: 'Group Policy',   icon: 'Lock' },
  { key: 'network',     label: 'Network',    icon: 'Wifi', group: 'More Tweaks' },
  { key: 'power',       label: 'Power',      icon: 'Zap' },
  { key: 'edge',        label: 'Edge',       icon: 'Globe' },
  { key: 'annoyances',  label: 'Annoyances', icon: 'Bell' },
  { key: 'developer',   label: 'Developer',  icon: 'Code2' },
  { key: 'audio',       label: 'Audio',      icon: 'Volume2' },
  { key: 'security',    label: 'Hardening',  icon: 'ShieldCheck' },
  { key: 'app-manager', label: 'App Manager',  icon: 'AppWindow', group: 'System' },
  { key: 'startup',     label: 'Startup Apps', icon: 'Power' },
  { key: 'hardware',    label: 'Hardware',     icon: 'Cpu' },
  { key: 'drivers',     label: 'GPU Drivers',  icon: 'Monitor' },
  { key: 'apps',        label: 'Install Apps', icon: 'Package', group: 'Tools' },
  { key: 'activity',    label: 'Activity',     icon: 'History' },
  { key: 'settings',    label: 'Settings',     icon: 'Settings' }
];

export function Sidebar({ current, onChange }: { current: ViewKey; onChange: (v: ViewKey) => void }) {
  return (
    <nav className="sidebar">
      {items.map((item) => (
        <div key={item.key}>
          {item.group && <div className="group">{item.group}</div>}
          <button
            className={`nav-item${current === item.key ? ' active' : ''}`}
            onClick={() => onChange(item.key)}
          >
            <span className="indicator" aria-hidden />
            <Icon name={item.icon} size={18} bold={current === item.key} />
            <span className="label">{item.label}</span>
          </button>
        </div>
      ))}
    </nav>
  );
}
