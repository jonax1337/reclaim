<script lang="ts">
  import { AlertTriangle, Check } from 'lucide-svelte';
  import type { Tweak } from '../types';
  import SeverityBadge from './SeverityBadge.svelte';
  import Toggle from './Toggle.svelte';

  let {
    tweak,
    applied,
    selected,
    onToggleApply,
    onToggleSelected
  }: {
    tweak: Tweak;
    applied: boolean;
    selected: boolean;
    onToggleApply: () => void;
    onToggleSelected: () => void;
  } = $props();

  let opCount = $derived(
    tweak.registry.length + tweak.services.length + tweak.appx.length + (tweak.ps_apply ? 1 : 0)
  );
</script>

<article class="card" class:applied class:selected class:risky={tweak.severity === 'risky'}>
  <button
    type="button"
    class="select"
    role="checkbox"
    aria-checked={selected}
    aria-label={selected ? `Deselect ${tweak.name}` : `Select ${tweak.name}`}
    onclick={(e) => { e.stopPropagation(); onToggleSelected(); }}
  >
    {#if selected}<Check size={12} strokeWidth={3} />{/if}
  </button>

  <div class="body">
    <header>
      <h3>{tweak.name}</h3>
      <SeverityBadge level={tweak.severity} />
    </header>

    <p class="desc">{tweak.description}</p>

    {#if tweak.warning}
      <div class="warn">
        <AlertTriangle size={13} strokeWidth={2} />
        <span>{tweak.warning}</span>
      </div>
    {/if}

    <footer>
      <span class="ops" title="{opCount} operation{opCount === 1 ? '' : 's'}">
        {opCount} op{opCount === 1 ? '' : 's'}
      </span>
      {#if tweak.presets.length > 0}
        <span class="dot-sep">·</span>
        {#each tweak.presets as p}
          <span class="preset">{p}</span>
        {/each}
      {/if}
      {#if applied}
        <span class="dot-sep">·</span>
        <span class="applied-tag"><Check size={10} strokeWidth={3} /> Applied</span>
      {/if}
    </footer>
  </div>

  <div class="action">
    <Toggle checked={applied} onchange={onToggleApply} />
  </div>
</article>

<style>
  .card {
    display: grid;
    grid-template-columns: 18px 1fr auto;
    gap: 14px;
    align-items: flex-start;
    padding: 14px 16px;
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    border-radius: var(--radius-md);
    transition:
      background-color var(--motion-fast) var(--ease-decel),
      border-color var(--motion-fast) var(--ease-decel),
      transform var(--motion-fast) var(--ease-decel),
      box-shadow var(--motion-normal) var(--ease-decel);
  }
  .card:hover {
    background: var(--surface-card-hover);
    border-color: var(--stroke-default);
    transform: translateY(-1px);
    box-shadow: var(--shadow-card);
  }
  .card.applied {
    background: rgba(76,194,255,0.045);
    border-color: rgba(76,194,255,0.18);
  }
  .card.applied:hover {
    background: rgba(76,194,255,0.075);
  }
  .card.selected {
    background: rgba(76,194,255,0.10);
    border-color: rgba(76,194,255,0.45);
    box-shadow: 0 0 0 1px rgba(76,194,255,0.25);
  }
  .card.risky.applied { border-color: rgba(255,153,164,0.30); }

  .select {
    width: 18px; height: 18px;
    margin-top: 2px;
    border-radius: 4px;
    border: 1.5px solid var(--text-tertiary);
    background: transparent;
    color: #000;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all var(--motion-fast) var(--ease-decel);
    cursor: pointer;
    padding: 0;
  }
  .select:hover { border-color: var(--text-secondary); background: var(--surface-card-hover); }
  .card.selected .select {
    background: var(--accent-fill);
    border-color: var(--accent-fill);
  }
  .select:focus-visible { outline-offset: 1px; }

  .body { min-width: 0; }

  header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
    flex-wrap: wrap;
  }
  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.4;
    letter-spacing: -0.1px;
  }
  .desc {
    margin: 0;
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
    max-width: 72ch;
  }

  .warn {
    margin-top: 8px;
    padding: 8px 10px;
    background: rgba(252,225,0,0.06);
    border: 1px solid rgba(252,225,0,0.18);
    border-radius: var(--radius-sm);
    color: #ffe680;
    font-size: 12px;
    line-height: 1.45;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .warn :global(svg) { flex-shrink: 0; margin-top: 1px; }

  footer {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    flex-wrap: wrap;
    font-size: 11px;
    color: var(--text-tertiary);
  }
  .ops { font-variant-numeric: tabular-nums; }
  .dot-sep { color: var(--text-disabled); }
  .preset {
    padding: 1px 7px;
    border-radius: 3px;
    background: var(--surface-card-active);
    color: var(--text-secondary);
    text-transform: capitalize;
    font-weight: 500;
    font-size: 10.5px;
    letter-spacing: 0.2px;
  }
  .applied-tag {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: var(--success);
    font-weight: 500;
  }

  .action { padding-top: 1px; }

  @media (prefers-reduced-motion: reduce) {
    .card:hover { transform: none; }
  }
</style>
