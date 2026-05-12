<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import Icon from './Icon.svelte';
  import { store } from '../stores/tweaks.svelte';
  import type { DiffOp } from '../types';

  let { ids, open = $bindable(false), onclose }: { ids: string[]; open: boolean; onclose: () => void } = $props();

  let ops = $state<DiffOp[]>([]);
  let loading = $state(false);
  let onlyChanges = $state(true);

  $effect(() => {
    if (open && ids.length > 0) {
      void load();
    } else if (!open) {
      ops = [];
    }
  });

  async function load() {
    loading = true;
    try {
      ops = await invoke<DiffOp[]>('diff_tweaks', { ids });
    } catch (e) {
      store.toast({ kind: 'err', msg: `Diff failed: ${e}` });
      ops = [];
    } finally {
      loading = false;
    }
  }

  function fmt(v: unknown): string {
    if (v === null || v === undefined) return '∅';
    if (typeof v === 'string') return v === '' ? '""' : v;
    return JSON.stringify(v);
  }

  let visible = $derived(onlyChanges ? ops.filter((o) => o.kind === 'powershell' || (o as any).will_change) : ops);
  let changeCount = $derived(ops.filter((o) => o.kind === 'powershell' || (o as any).will_change).length);
  let noopCount = $derived(ops.length - changeCount);

  function close() {
    open = false;
    onclose?.();
  }
</script>

{#if open}
  <div class="overlay" onclick={close} role="presentation">
    <div
      class="dialog"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => { if (e.key === 'Escape') close(); }}
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <header>
        <div>
          <h2>Preview changes</h2>
          <p class="sub">
            {#if loading}Inspecting system…
            {:else}{changeCount} change{changeCount === 1 ? '' : 's'} · {noopCount} already in place{/if}
          </p>
        </div>
        <button class="x" onclick={close} aria-label="Close"><Icon name="X" size={14} /></button>
      </header>

      <div class="toolbar">
        <label>
          <input type="checkbox" bind:checked={onlyChanges} /> Only show changes
        </label>
      </div>

      <div class="body">
        {#if loading}
          <p class="status">Loading…</p>
        {:else if visible.length === 0}
          <p class="status">Nothing will change — every operation in this batch is already at the desired state.</p>
        {:else}
          <table>
            <thead>
              <tr>
                <th>Tweak</th>
                <th>Type</th>
                <th>Target</th>
                <th>Current</th>
                <th></th>
                <th>Desired</th>
              </tr>
            </thead>
            <tbody>
              {#each visible as op, i}
                <tr class:noop={!(op as any).will_change && op.kind !== 'powershell'}>
                  <td class="name">{op.tweak_name}</td>
                  <td class="kind">
                    {#if op.kind === 'registry'}<Icon name="Settings" size={11} /> reg
                    {:else if op.kind === 'service'}<Icon name="Server" size={11} /> svc
                    {:else if op.kind === 'appx'}<Icon name="Package" size={11} /> appx
                    {:else}<Icon name="Code2" size={11} /> ps{/if}
                  </td>
                  {#if op.kind === 'registry'}
                    <td class="target"><code>{op.path}\{op.name}</code></td>
                    <td class="cur"><code>{fmt(op.current)}</code></td>
                    <td class="arrow"><Icon name="ArrowRight" size={11} /></td>
                    <td class="new"><code>{fmt(op.desired)}</code></td>
                  {:else if op.kind === 'service'}
                    <td class="target"><code>{op.service}</code></td>
                    <td class="cur"><code>{op.current ?? 'not found'}</code></td>
                    <td class="arrow"><Icon name="ArrowRight" size={11} /></td>
                    <td class="new"><code>{op.desired}</code></td>
                  {:else if op.kind === 'appx'}
                    <td class="target"><code>{op.package}</code></td>
                    <td class="cur"><code>{op.currently_installed ? 'installed' : 'absent'}</code></td>
                    <td class="arrow"><Icon name="ArrowRight" size={11} /></td>
                    <td class="new"><code>removed</code></td>
                  {:else}
                    <td class="target" colspan="4"><code class="snippet">{op.snippet.slice(0, 200)}{op.snippet.length > 200 ? '…' : ''}</code></td>
                  {/if}
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>

      <footer>
        <button class="ghost" onclick={close}>Close</button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    display: grid;
    place-items: center;
    z-index: 100;
    backdrop-filter: blur(6px);
  }
  .dialog {
    width: min(960px, 92vw);
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    background: var(--surface-overlay);
    backdrop-filter: blur(32px);
    -webkit-backdrop-filter: blur(32px);
    border: 1px solid var(--stroke-default);
    border-radius: var(--radius-lg);
    box-shadow: 0 24px 64px rgba(0,0,0,0.5);
    overflow: hidden;
  }
  .dialog thead { background: var(--surface-overlay); }
  header {
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    border-bottom: 1px solid var(--stroke-subtle);
  }
  h2 { margin: 0; font-size: 15px; font-weight: 600; }
  .sub { margin: 2px 0 0; color: var(--text-tertiary); font-size: 12px; font-variant-numeric: tabular-nums; }
  .x { background: transparent; padding: 4px; border-radius: 4px; color: var(--text-secondary); cursor: pointer; }
  .x:hover { background: var(--surface-card-hover); color: var(--text-primary); }
  .toolbar {
    padding: 8px 20px;
    border-bottom: 1px solid var(--stroke-subtle);
    font-size: 12px;
    color: var(--text-secondary);
    display: flex; gap: 12px; align-items: center;
  }
  .toolbar label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
  .body {
    flex: 1;
    overflow: auto;
    padding: 0;
  }
  .status { padding: 24px; color: var(--text-tertiary); font-size: 13px; text-align: center; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  thead {
    position: sticky;
    top: 0;
    background: var(--surface-card);
    z-index: 1;
  }
  th {
    text-align: left;
    padding: 10px 12px;
    font-weight: 500;
    text-transform: uppercase;
    font-size: 10.5px;
    letter-spacing: 0.5px;
    color: var(--text-tertiary);
    border-bottom: 1px solid var(--stroke-subtle);
  }
  td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--stroke-subtle);
    vertical-align: top;
  }
  tr.noop { opacity: 0.55; }
  .name { color: var(--text-primary); font-weight: 500; max-width: 180px; }
  .kind { color: var(--text-tertiary); white-space: nowrap; font-variant: small-caps; }
  .target code, .cur code, .new code, .snippet {
    font-family: var(--font-mono);
    font-size: 11px;
    background: var(--surface-card-active);
    padding: 1px 5px;
    border-radius: 3px;
    word-break: break-all;
  }
  .new code { color: var(--accent-fill); border: 1px solid rgba(76,194,255,0.25); }
  .cur code { color: var(--text-secondary); }
  .arrow { color: var(--text-tertiary); width: 20px; }
  .snippet { display: block; white-space: pre-wrap; max-height: 6em; overflow: hidden; }
  footer {
    padding: 12px 20px;
    border-top: 1px solid var(--stroke-subtle);
    display: flex; justify-content: flex-end; gap: 8px;
  }
  .ghost {
    padding: 6px 14px;
    border: 1px solid var(--stroke-default);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-primary);
    font-size: 12.5px;
    cursor: pointer;
  }
  .ghost:hover { background: var(--surface-card-hover); }
</style>
