<script lang="ts">
  import { store } from '../stores/tweaks.svelte';
  import { Sparkles, ShieldOff, Flame } from 'lucide-svelte';

  const presets = [
    { key: 'minimal',     label: 'Minimal',     icon: Sparkles, hint: 'Show file extensions, disable telemetry & Bing.' },
    { key: 'recommended', label: 'Recommended', icon: ShieldOff, hint: 'Balanced privacy + a clean UI.' },
    { key: 'aggressive',  label: 'Aggressive',  icon: Flame,    hint: 'Strip Xbox, location, optional features.' }
  ] as const;
</script>

<div class="chips">
  <span class="lbl">Presets:</span>
  {#each presets as p}
    <button
      class="chip"
      class:active={store.preset === p.key}
      title={p.hint}
      onclick={() => store.applyPreset(store.preset === p.key ? null : p.key)}
    >
      <p.icon size={13} strokeWidth={2} />
      {p.label}
    </button>
  {/each}
  {#if store.preset}
    <button class="chip clear" onclick={() => store.applyPreset(null)}>Clear</button>
  {/if}
</div>

<style>
  .chips {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .lbl { font-size: 12px; color: var(--text-tertiary); margin-right: 2px; }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    transition: all var(--motion-fast) var(--ease-decel);
  }
  .chip:hover { background: var(--surface-card-hover); color: var(--text-primary); }
  .chip.active {
    background: rgba(76,194,255,0.14);
    border-color: rgba(76,194,255,0.40);
    color: var(--accent-text);
  }
  .chip.clear { color: var(--text-tertiary); }
</style>
