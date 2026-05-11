<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { onMount } from 'svelte';
  import { getCurrentWindow } from '@tauri-apps/api/window';

  import TitleBar from '$lib/components/TitleBar.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Dashboard from '$lib/components/Dashboard.svelte';
  import TweakCard from '$lib/components/TweakCard.svelte';
  import ApplyBar from '$lib/components/ApplyBar.svelte';
  import PresetChips from '$lib/components/PresetChips.svelte';
  import Toasts from '$lib/components/Toasts.svelte';
  import AppsPanel from '$lib/components/AppsPanel.svelte';
  import ServiceBrowser from '$lib/components/ServiceBrowser.svelte';
  import SettingsPanel from '$lib/components/SettingsPanel.svelte';
  import ActivityPanel from '$lib/components/ActivityPanel.svelte';
  import AppManager from '$lib/components/AppManager.svelte';
  import StartupApps from '$lib/components/StartupApps.svelte';
  import HardwarePanel from '$lib/components/HardwarePanel.svelte';
  import DriversPanel from '$lib/components/DriversPanel.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import { store } from '$lib/stores/tweaks.svelte';
  import type { ViewKey } from '$lib/types';

  let view = $state<ViewKey>('dashboard');
  let servicesTab = $state<'curated' | 'browser'>('curated');
  let paletteOpen = $state(false);

  function onkeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      paletteOpen = !paletteOpen;
    }
  }

  const titles: Record<ViewKey, string> = {
    dashboard: 'Dashboard',
    privacy: 'Privacy & Telemetry',
    bloatware: 'Bloatware',
    ai: 'AI Features',
    explorer: 'Explorer & Shell',
    search: 'Search',
    performance: 'Performance',
    gaming: 'Gaming',
    services: 'Services',
    apps: 'Install Apps',
    'app-manager': 'App Manager',
    startup: 'Startup Apps',
    hardware: 'Hardware',
    drivers: 'GPU Drivers',
    updates: 'Windows Update',
    'group-policy': 'Group Policy',
    network: 'Network',
    power: 'Power',
    edge: 'Microsoft Edge',
    annoyances: 'Annoyances',
    developer: 'Developer',
    audio: 'Audio',
    security: 'Security Hardening',
    activity: 'Activity',
    settings: 'Settings'
  };

  const subtitles: Record<ViewKey, string> = {
    dashboard: '',
    privacy: 'Stop the diagnostic stream and the personalised-ad pipeline.',
    bloatware: 'Remove pre-installed UWP apps for all users — and stop them returning.',
    ai: 'Disable Copilot and Recall.',
    explorer: 'Reclaim the file manager and the shell.',
    search: 'Cut Bing out of the Start menu.',
    performance: 'Snappier visuals, fewer background services.',
    gaming: 'Tweaks for full-screen play.',
    services: 'Disable the services you do not need.',
    apps: 'Curated list installed via winget. Silent & unattended.',
    'app-manager': 'All bundled UWP apps. Remove what you don\'t use, reinstall what you removed by mistake.',
    startup: 'Programs that run when you log in. Toggle exactly what Task Manager > Startup does.',
    hardware: 'Live snapshot of your system. CPU, GPU, RAM, motherboard, storage.',
    drivers: 'Detected GPU driver versions and one-click installs of vendor updaters.',
    updates: 'Defer feature releases, exclude drivers, set active hours — without disabling security patches.',
    'group-policy': 'GPO-only policies that normally need gpedit.msc on Pro/Enterprise.',
    network: 'IPv6, LLMNR, NetBIOS, DoH, P2P-update sharing.',
    power: 'Hibernation, fast-startup, USB selective suspend, PCIe link mgmt.',
    edge: 'Strip the Edge re-bloat: Copilot sidebar, Bing, mini-menu, sponsored shopping.',
    annoyances: 'Win11 24H2/25H2 nags: auto-BitLocker, Hello prompts, Suggested Actions.',
    developer: 'Dev Mode, long paths, dark mode for legacy apps, full path in title bar.',
    audio: 'Communications ducking, system beep, logon sound.',
    security: 'Opposite direction: DEP, LSA Protection, no WSH, no WPAD, no SMBv1.',
    activity: 'Every applied tweak in chronological order — revert any of them here.',
    settings: 'Theme, default behaviours, system info.'
  };

  const categoryFor: Partial<Record<ViewKey, string>> = {
    privacy: 'privacy',
    bloatware: 'bloatware',
    ai: 'ai',
    explorer: 'explorer',
    search: 'search',
    performance: 'performance',
    gaming: 'gaming',
    services: 'services',
    updates: 'updates',
    'group-policy': 'group-policy',
    network: 'network',
    power: 'power',
    edge: 'edge',
    annoyances: 'annoyances',
    developer: 'developer',
    audio: 'audio',
    security: 'security'
  };

  let visibleTweaks = $derived.by(() => {
    const cat = categoryFor[view];
    if (!cat) return [];
    return store.tweaks.filter((t) => {
      if (t.category !== cat) return false;
      if (store.search) {
        const q = store.search.toLowerCase();
        if (!t.name.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  });

  let confirmOpen = $derived(store.pendingConfirm !== null);

  onMount(async () => {
    settings.applyTheme();
    try {
      await getCurrentWindow().setEffects({ effects: ['mica'] as any });
    } catch {}
    await store.load();
  });
</script>

<svelte:window onkeydown={onkeydown} />

<TitleBar />

<main>
  <Sidebar bind:current={view} />

  <section class="content">
    <header class="top">
      <div>
        <h1>{titles[view]}</h1>
        {#if subtitles[view]}<p class="sub">{subtitles[view]}</p>{/if}
      </div>
      {#if categoryFor[view] || view === 'services'}
        <div class="search">
          <Icon name="Search" size={14} />
          <input type="search" placeholder="Filter tweaks…" bind:value={store.search} />
        </div>
      {/if}
    </header>

    <div class="scroll">
      {#if view === 'dashboard'}
        <Dashboard />
        <div class="presets-row"><PresetChips /></div>
        {#if store.loading}
          <Skeleton count={6} />
        {:else}
          <div class="grid">
            {#each store.tweaks.slice(0, 6) as tweak (tweak.id)}
              <TweakCard
                {tweak}
                applied={store.applied.has(tweak.id)}
                selected={store.selected.has(tweak.id)}
                onToggleApply={() => store.toggle(tweak.id)}
                onToggleSelected={() => store.toggleSelected(tweak.id)}
              />
            {/each}
          </div>
        {/if}
      {:else if view === 'apps'}
        <AppsPanel />
      {:else if view === 'app-manager'}
        <AppManager />
      {:else if view === 'startup'}
        <StartupApps />
      {:else if view === 'hardware'}
        <HardwarePanel />
      {:else if view === 'drivers'}
        <DriversPanel />
      {:else if view === 'settings'}
        <SettingsPanel />
      {:else if view === 'activity'}
        <ActivityPanel />
      {:else if view === 'services'}
        <div class="seg" role="tablist">
          <button role="tab" aria-selected={servicesTab === 'curated'} class:active={servicesTab === 'curated'} onclick={() => (servicesTab = 'curated')}>Curated tweaks</button>
          <button role="tab" aria-selected={servicesTab === 'browser'} class:active={servicesTab === 'browser'} onclick={() => (servicesTab = 'browser')}>All services</button>
        </div>
        {#if servicesTab === 'curated'}
          <div class="presets-row"><PresetChips /></div>
          {#if store.loading}
            <Skeleton count={4} />
          {:else if visibleTweaks.length === 0}
            <div class="empty"><p>No service tweaks match your filter.</p></div>
          {:else}
            <div class="grid">
              {#each visibleTweaks as tweak (tweak.id)}
                <TweakCard
                  {tweak}
                  applied={store.applied.has(tweak.id)}
                  selected={store.selected.has(tweak.id)}
                  onToggleApply={() => store.toggle(tweak.id)}
                  onToggleSelected={() => store.toggleSelected(tweak.id)}
                />
              {/each}
            </div>
          {/if}
        {:else}
          <ServiceBrowser />
        {/if}
      {:else}
        <div class="presets-row"><PresetChips /></div>
        {#if store.loading}
          <Skeleton count={5} />
        {:else if visibleTweaks.length === 0}
          <div class="empty">
            <p>No tweaks match your filter in this category.</p>
            {#if store.search}
              <button class="link" onclick={() => (store.search = '')}>Clear filter</button>
            {/if}
          </div>
        {:else}
          <div class="grid">
            {#each visibleTweaks as tweak (tweak.id)}
              <TweakCard
                {tweak}
                applied={store.applied.has(tweak.id)}
                selected={store.selected.has(tweak.id)}
                onToggleApply={() => store.toggle(tweak.id)}
                onToggleSelected={() => store.toggleSelected(tweak.id)}
              />
            {/each}
          </div>
        {/if}
      {/if}

      <ApplyBar />
    </div>
  </section>
</main>

<Toasts />

<CommandPalette bind:open={paletteOpen} onnavigate={(v) => (view = v)} />

{#if store.pendingConfirm}
  {@const req = store.pendingConfirm}
  <ConfirmDialog
    bind:open={confirmOpen}
    title={req.title}
    body={req.body}
    danger={req.danger}
    confirmLabel={req.confirmLabel ?? 'Confirm'}
    onconfirm={() => {
      void req.onconfirm();
      store.pendingConfirm = null;
    }}
  />
{/if}

<style>
  main {
    display: flex;
    height: calc(100vh - 40px);
    background: var(--surface-base);
  }
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .top {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 22px 24px 14px;
    gap: 16px;
    min-height: 70px;
  }
  h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.3px;
  }
  .sub {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--text-secondary);
    max-width: 70ch;
  }
  .search { position: relative; width: 240px; flex-shrink: 0; }
  .search input { padding-left: 28px; width: 100%; font-size: 13px; }
  .search :global(svg) {
    position: absolute; left: 8px; top: 50%; transform: translateY(-50%);
    color: var(--text-tertiary);
  }
  .scroll {
    flex: 1;
    overflow-y: auto;
    padding: 0 24px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    scroll-behavior: smooth;
  }
  .presets-row { padding: 4px 4px 12px; }
  .grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .empty {
    text-align: center;
    color: var(--text-tertiary);
    padding: 80px 0;
    font-size: 13px;
  }
  .empty p { margin: 0 0 8px; }
  .link {
    color: var(--accent-text);
    font-size: 13px;
    padding: 4px 10px;
    border-radius: 4px;
  }
  .link:hover { background: var(--surface-card-hover); }

  .seg {
    display: inline-flex;
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    border-radius: var(--radius-sm);
    padding: 2px;
    margin-bottom: 12px;
  }
  .seg button {
    padding: 5px 14px;
    font-size: 12px;
    color: var(--text-secondary);
    border-radius: 3px;
    transition: all var(--motion-fast) var(--ease-decel);
  }
  .seg button:hover { color: var(--text-primary); }
  .seg button.active {
    background: var(--surface-card-active);
    color: var(--text-primary);
    font-weight: 500;
  }
</style>
