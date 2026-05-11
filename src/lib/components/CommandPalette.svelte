<script lang="ts">
  import Icon from './Icon.svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { store } from '../stores/tweaks.svelte';
  import type { ViewKey } from '../types';

  let {
    open = $bindable<boolean>(false),
    onnavigate
  }: { open: boolean; onnavigate: (v: ViewKey) => void } = $props();

  let query = $state('');
  let cursor = $state(0);
  let inputEl: HTMLInputElement | undefined = $state();

  type Item =
    | { kind: 'nav'; id: ViewKey; label: string; hint: string }
    | { kind: 'tweak'; id: string; label: string; hint: string; applied: boolean; cat: string }
    | { kind: 'app'; id: string; label: string; hint: string };

  const navItems: Extract<Item, { kind: 'nav' }>[] = [
    { kind: 'nav', id: 'dashboard',   label: 'Dashboard',           hint: 'Go to overview' },
    { kind: 'nav', id: 'privacy',     label: 'Privacy & Telemetry', hint: 'Go to category' },
    { kind: 'nav', id: 'bloatware',   label: 'Bloatware',           hint: 'Go to category' },
    { kind: 'nav', id: 'ai',          label: 'AI Features',         hint: 'Go to category' },
    { kind: 'nav', id: 'explorer',    label: 'Explorer & Shell',    hint: 'Go to category' },
    { kind: 'nav', id: 'search',      label: 'Search',              hint: 'Go to category' },
    { kind: 'nav', id: 'performance', label: 'Performance',         hint: 'Go to category' },
    { kind: 'nav', id: 'gaming',      label: 'Gaming',              hint: 'Go to category' },
    { kind: 'nav', id: 'services',    label: 'Services',            hint: 'Go to category' },
    { kind: 'nav', id: 'apps',        label: 'Install Apps',        hint: 'Go to category' }
  ];

  function fuzzy(text: string, q: string): boolean {
    if (!q) return true;
    const t = text.toLowerCase();
    let i = 0;
    for (const ch of q.toLowerCase()) {
      const idx = t.indexOf(ch, i);
      if (idx === -1) return false;
      i = idx + 1;
    }
    return true;
  }

  let results = $derived.by<Item[]>(() => {
    const q = query.trim();
    const items: Item[] = [];

    for (const n of navItems) {
      if (fuzzy(n.label, q)) items.push(n);
    }
    for (const t of store.tweaks) {
      if (fuzzy(t.name, q) || fuzzy(t.description, q)) {
        items.push({
          kind: 'tweak',
          id: t.id,
          label: t.name,
          hint: t.description,
          applied: store.applied.has(t.id),
          cat: t.category
        });
      }
    }
    for (const a of store.apps) {
      if (fuzzy(a.name, q) || fuzzy(a.id, q)) {
        items.push({ kind: 'app', id: a.id, label: a.name, hint: a.id });
      }
    }
    return items.slice(0, 50);
  });

  $effect(() => {
    if (open) {
      query = '';
      cursor = 0;
      queueMicrotask(() => inputEl?.focus());
    }
  });

  $effect(() => {
    void results;
    cursor = 0;
  });

  function close() { open = false; }

  async function activate(item: Item) {
    if (item.kind === 'nav') {
      onnavigate(item.id);
    } else if (item.kind === 'tweak') {
      // Navigate to category & toggle.
      const tweak = store.tweaks.find((t) => t.id === item.id);
      if (tweak) {
        onnavigate(tweak.category as ViewKey);
        await store.toggle(tweak.id);
      }
    } else {
      try {
        store.toast({ kind: 'info', msg: `Installing ${item.label}…` });
        await invoke('install_winget_app', { id: item.id });
        store.toast({ kind: 'ok', msg: `Installed ${item.label}` });
      } catch (e) {
        store.toast({ kind: 'err', msg: `${item.label}: ${e}` });
      }
    }
    close();
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); cursor = Math.min(cursor + 1, results.length - 1); scrollCursorIntoView(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cursor = Math.max(cursor - 1, 0); scrollCursorIntoView(); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = results[cursor]; if (it) activate(it); }
  }

  function scrollCursorIntoView() {
    queueMicrotask(() => {
      const el = document.querySelector(`[data-cmd-idx="${cursor}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    });
  }
</script>

{#if open}
  <div class="scrim" onclick={close} role="presentation"></div>
  <div class="palette" role="dialog" aria-modal="true" aria-label="Command palette">
    <div class="input-row">
      <Icon name="Search" size={16} />
      <input
        bind:this={inputEl}
        bind:value={query}
        onkeydown={onkeydown}
        placeholder="Search tweaks, apps, pages…"
        autocomplete="off"
        spellcheck="false"
      />
      <kbd>esc</kbd>
    </div>

    <div class="results">
      {#if results.length === 0}
        <p class="empty">No matches.</p>
      {:else}
        {#each results as item, i (item.kind + ':' + item.id)}
          <button
            type="button"
            data-cmd-idx={i}
            class="item"
            class:cursor={i === cursor}
            onclick={() => activate(item)}
            onmouseenter={() => (cursor = i)}
          >
            <span class="icon">
              {#if item.kind === 'nav'}<Icon name="LayoutDashboard" size={14} />
              {:else if item.kind === 'tweak'}<Icon name="ToggleRight" size={14} />
              {:else}<Icon name="Package" size={14} />{/if}
            </span>
            <span class="label">{item.label}</span>
            <span class="hint">{item.hint}</span>
            {#if item.kind === 'tweak'}
              <span class="badge {item.applied ? 'on' : ''}">
                {item.applied ? 'Revert' : 'Apply'}
              </span>
            {:else if item.kind === 'app'}
              <span class="badge">Install</span>
            {:else}
              <span class="badge muted">Open</span>
            {/if}
          </button>
        {/each}
      {/if}
    </div>

    <footer>
      <span class="ft"><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
      <span class="ft"><kbd><Icon name="CornerDownLeft" size={10} /></kbd> select</span>
      <span class="ft right">{results.length} result{results.length === 1 ? '' : 's'}</span>
    </footer>
  </div>
{/if}

<style>
  .scrim {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 800;
    animation: fade-in 120ms var(--ease-decel);
  }
  .palette {
    position: fixed;
    top: 12vh;
    left: 50%;
    transform: translateX(-50%);
    width: min(620px, calc(100vw - 48px));
    background: var(--surface-overlay);
    backdrop-filter: blur(28px);
    border: 1px solid var(--stroke-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-flyout);
    z-index: 801;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 70vh;
    animation: rise 180ms var(--ease-decel);
  }
  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes rise {
    from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  .input-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--stroke-subtle);
    color: var(--text-tertiary);
  }
  .input-row input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 15px;
    outline: none;
    padding: 0;
  }
  .input-row input::placeholder { color: var(--text-tertiary); }
  .input-row input:focus { padding: 0; border: none; }

  kbd {
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 2px 6px;
    background: var(--surface-card-active);
    border: 1px solid var(--stroke-default);
    border-radius: 3px;
    color: var(--text-secondary);
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  .results {
    flex: 1;
    overflow-y: auto;
    padding: 4px;
  }
  .empty { padding: 32px 0; text-align: center; color: var(--text-tertiary); font-size: 13px; }

  .item {
    display: grid;
    grid-template-columns: 24px 1fr auto;
    grid-template-rows: auto auto;
    gap: 0 10px;
    align-items: center;
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border-radius: var(--radius-sm);
    text-align: left;
    color: var(--text-primary);
    transition: background-color 80ms var(--ease-decel);
  }
  .item.cursor { background: var(--surface-card-active); }
  .item .icon { grid-row: 1 / 3; color: var(--text-tertiary); display: flex; align-items: center; }
  .item.cursor .icon { color: var(--accent-default); }
  .item .label { font-size: 13px; font-weight: 500; }
  .item .hint {
    grid-column: 2;
    font-size: 11px;
    color: var(--text-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  .badge {
    grid-row: 1 / 3;
    padding: 3px 9px;
    font-size: 11px;
    font-weight: 500;
    border-radius: 999px;
    background: rgba(76,194,255,0.14);
    color: var(--accent-text);
    border: 1px solid rgba(76,194,255,0.25);
  }
  .badge.on { background: rgba(255,153,164,0.10); color: var(--severity-risky); border-color: rgba(255,153,164,0.25); }
  .badge.muted { background: var(--surface-card-active); color: var(--text-tertiary); border-color: var(--stroke-subtle); }

  footer {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 8px 14px;
    border-top: 1px solid var(--stroke-subtle);
    font-size: 11px;
    color: var(--text-tertiary);
  }
  .ft { display: inline-flex; align-items: center; gap: 5px; }
  .ft.right { margin-left: auto; }
</style>
