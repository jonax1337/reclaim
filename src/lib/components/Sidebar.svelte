<script lang="ts">
  import Icon from './Icon.svelte';
  import type { FluentIconName } from '../icons';
  import type { ViewKey } from '../types';

  let { current = $bindable<ViewKey>('dashboard') }: { current: ViewKey } = $props();

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
</script>

<nav class="sidebar">
  {#each items as item, i (item.key)}
    {#if item.group}
      <div class="group">{item.group}</div>
    {/if}
    <button
      class="nav-item"
      class:active={current === item.key}
      onclick={() => (current = item.key)}
    >
      <span class="indicator" aria-hidden="true"></span>
      <Icon name={item.icon} size={18} bold={current === item.key} />
      <span class="label">{item.label}</span>
    </button>
  {/each}
</nav>

<style>
  .sidebar {
    width: 240px;
    flex-shrink: 0;
    padding: 8px 8px 16px;
    background: var(--surface-sidebar);
    border-right: 1px solid var(--stroke-subtle);
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
  }
  .group {
    margin: 14px 12px 6px;
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    color: var(--text-tertiary);
    font-weight: 600;
  }
  .group:first-child {
    margin-top: 6px;
  }
  .nav-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px 8px 16px;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    transition: background-color var(--motion-fast) var(--ease-decel),
                color var(--motion-fast) var(--ease-decel);
    text-align: left;
  }
  .nav-item:hover { background: var(--surface-card-hover); color: var(--text-primary); }
  .nav-item.active { background: var(--surface-card-active); color: var(--text-primary); }
  .indicator {
    position: absolute;
    left: 4px;
    top: 50%;
    width: 3px;
    height: 0;
    border-radius: 2px;
    background: var(--accent-default);
    transform: translateY(-50%);
    transition: height var(--motion-normal) var(--ease-decel);
  }
  .nav-item.active .indicator { height: 16px; }
  .label { flex: 1; font-size: 13px; font-weight: 400; }
</style>
