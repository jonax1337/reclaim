import type { FC, ReactElement } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import {
  NavDrawer,
  NavDrawerBody,
  NavItem,
  NavSectionHeader
} from '@fluentui/react-nav-preview';
import {
  Board20Regular, Board20Filled,
  Sparkle20Regular, Sparkle20Filled,
  ShieldDismiss20Regular, ShieldDismiss20Filled,
  Delete20Regular, Delete20Filled,
  FolderOpen20Regular, FolderOpen20Filled,
  Search20Regular, Search20Filled,
  Gauge20Regular, Gauge20Filled,
  Games20Regular, Games20Filled,
  Options20Regular, Options20Filled,
  ArrowCounterclockwise20Regular, ArrowCounterclockwise20Filled,
  LockClosed20Regular, LockClosed20Filled,
  Wifi120Regular, Wifi120Filled,
  Power20Regular, Power20Filled,
  Globe20Regular, Globe20Filled,
  Alert20Regular, Alert20Filled,
  Code20Regular, Code20Filled,
  Speaker220Regular, Speaker220Filled,
  ShieldCheckmark20Regular, ShieldCheckmark20Filled,
  DeveloperBoard20Regular, DeveloperBoard20Filled,
  Desktop20Regular, Desktop20Filled,
  Box20Regular, Box20Filled,
  History20Regular, History20Filled,
  Settings20Regular, Settings20Filled
} from '@fluentui/react-icons';
import type { ViewKey } from '../../types';

type IconPair = { regular: FC; filled: FC };

const ic: Record<string, IconPair> = {
  dashboard: { regular: Board20Regular, filled: Board20Filled },
  profiles: { regular: Sparkle20Regular, filled: Sparkle20Filled },
  privacy: { regular: ShieldDismiss20Regular, filled: ShieldDismiss20Filled },
  bloatware: { regular: Delete20Regular, filled: Delete20Filled },
  ai: { regular: Sparkle20Regular, filled: Sparkle20Filled },
  explorer: { regular: FolderOpen20Regular, filled: FolderOpen20Filled },
  search: { regular: Search20Regular, filled: Search20Filled },
  performance: { regular: Gauge20Regular, filled: Gauge20Filled },
  gaming: { regular: Games20Regular, filled: Games20Filled },
  services: { regular: Options20Regular, filled: Options20Filled },
  updates: { regular: ArrowCounterclockwise20Regular, filled: ArrowCounterclockwise20Filled },
  'group-policy': { regular: LockClosed20Regular, filled: LockClosed20Filled },
  network: { regular: Wifi120Regular, filled: Wifi120Filled },
  power: { regular: Power20Regular, filled: Power20Filled },
  edge: { regular: Globe20Regular, filled: Globe20Filled },
  annoyances: { regular: Alert20Regular, filled: Alert20Filled },
  developer: { regular: Code20Regular, filled: Code20Filled },
  audio: { regular: Speaker220Regular, filled: Speaker220Filled },
  security: { regular: ShieldCheckmark20Regular, filled: ShieldCheckmark20Filled },
  startup: { regular: Power20Regular, filled: Power20Filled },
  hardware: { regular: DeveloperBoard20Regular, filled: DeveloperBoard20Filled },
  drivers: { regular: Desktop20Regular, filled: Desktop20Filled },
  apps: { regular: Box20Regular, filled: Box20Filled },
  activity: { regular: History20Regular, filled: History20Filled },
  settings: { regular: Settings20Regular, filled: Settings20Filled }
};

type Section = { header: string; items: { key: ViewKey; label: string }[] };

const sections: Section[] = [
  { header: 'Overview', items: [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'profiles',  label: 'Profiles' }
  ]},
  { header: 'Tweaks', items: [
    { key: 'privacy',      label: 'Privacy' },
    { key: 'bloatware',    label: 'Bloatware' },
    { key: 'ai',           label: 'AI Features' },
    { key: 'explorer',     label: 'Explorer' },
    { key: 'search',       label: 'Search' },
    { key: 'performance',  label: 'Performance' },
    { key: 'gaming',       label: 'Gaming' },
    { key: 'services',     label: 'Services' },
    { key: 'updates',      label: 'Windows Update' },
    { key: 'group-policy', label: 'Group Policy' }
  ]},
  { header: 'More Tweaks', items: [
    { key: 'network',    label: 'Network' },
    { key: 'power',      label: 'Power' },
    { key: 'edge',       label: 'Edge' },
    { key: 'annoyances', label: 'Annoyances' },
    { key: 'developer',  label: 'Developer' },
    { key: 'audio',      label: 'Audio' },
    { key: 'security',   label: 'Hardening' }
  ]},
  { header: 'System', items: [
    { key: 'apps',        label: 'Apps' },
    { key: 'startup',     label: 'Startup Apps' },
    { key: 'hardware',    label: 'Hardware' },
    { key: 'drivers',     label: 'GPU Drivers' }
  ]},
  { header: 'Tools', items: [
    { key: 'activity', label: 'Activity' },
    { key: 'settings', label: 'Settings' }
  ]}
];

const useStyles = makeStyles({
  drawer: {
    height: '100%',
    width: '288px',
    flexShrink: 0,
    backgroundColor: 'transparent',
    borderRightWidth: '1px',
    borderRightStyle: 'solid',
    borderRightColor: tokens.colorNeutralStroke2,
    // Bottom breathing room — Fluent's NavDrawerBody has no padding-bottom
    '& .fui-NavDrawerBody': {
      paddingBottom: tokens.spacingVerticalM,
      paddingTop: tokens.spacingVerticalXS
    },
    // Richer hover/select transitions — Fluent default is fade in 100ms only
    '& .fui-NavItem': {
      transitionDuration: tokens.durationNormal,
      transitionTimingFunction: tokens.curveDecelerateMax,
      transitionProperty: 'background-color, color'
    },
    '& .fui-NavItem__icon': {
      transitionDuration: tokens.durationNormal,
      transitionTimingFunction: tokens.curveDecelerateMax,
      transitionProperty: 'color, transform'
    }
  }
});

export function Sidebar({ current, onChange }: { current: ViewKey; onChange: (v: ViewKey) => void }) {
  const s = useStyles();

  return (
    <NavDrawer
      open
      type="inline"
      selectedValue={current}
      onNavItemSelect={(_, d) => {
        if (d.value) onChange(d.value as ViewKey);
      }}
      className={s.drawer}
      density="medium"
    >
      <NavDrawerBody>
        {sections.map((section) => (
          <div key={section.header}>
            <NavSectionHeader>{section.header}</NavSectionHeader>
            {section.items.map((item) => {
              const isActive = current === item.key;
              const pair = ic[item.key];
              const IconComp = (isActive ? pair?.filled : pair?.regular) as FC<{ className?: string }> | undefined;
              return (
                <NavItem
                  key={item.key}
                  value={item.key}
                  icon={IconComp ? (<IconComp /> as ReactElement) : undefined}
                >
                  {item.label}
                </NavItem>
              );
            })}
          </div>
        ))}
      </NavDrawerBody>
    </NavDrawer>
  );
}
