<script lang="ts">
  import Icon from './Icon.svelte';
  import { store } from '../stores/tweaks.svelte';
  import { settings } from '../stores/settings.svelte';

  let restorePoint = $state(settings.restorePointDefault);
  let count = $derived(store.selected.size);

  $effect(() => { restorePoint = settings.restorePointDefault; });
</script>

{#if count > 0}
  <div class="bar">
    <div class="count">
      <span class="num">{count}</span>
      <span class="label">tweak{count === 1 ? '' : 's'} selected</span>
      <button class="clear" onclick={() => (store.selected = new Set())}>Clear</button>
    </div>

    <div class="divider" aria-hidden="true"></div>

    <label class="rp">
      <input type="checkbox" bind:checked={restorePoint} />
      <Icon name="ShieldCheck" size={13} strokeWidth={1.75} />
      <span>Restore point first</span>
    </label>

    <button class="primary" onclick={() => store.applySelection(restorePoint)}>
      <Icon name="Play" size={13} strokeWidth={2.25} />
      Apply selected
    </button>
  </div>
{/if}

<style>
  .bar {
    position: sticky;
    bottom: 16px;
    margin: 16px 24px 0;
    padding: 8px 8px 8px 14px;
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--surface-overlay);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--stroke-default);
    border-radius: 12px;
    box-shadow: var(--shadow-flyout);
    animation: rise var(--motion-normal) var(--ease-decel);
  }
  @keyframes rise {
    from { transform: translateY(8px); opacity: 0; }
    to   { transform: translateY(0);  opacity: 1; }
  }

  .count {
    flex: 1;
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary);
    padding-left: 4px;
  }
  .num {
    color: var(--text-primary);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .label { color: var(--text-secondary); }

  .clear {
    margin-left: 10px;
    padding: 3px 8px;
    font-size: 12px;
    color: var(--text-tertiary);
    border-radius: 6px;
    transition: background-color var(--motion-fast) var(--ease-decel),
                color var(--motion-fast) var(--ease-decel);
  }
  .clear:hover { background: var(--surface-card-hover); color: var(--text-primary); }

  .divider {
    width: 1px;
    height: 22px;
    background: var(--stroke-subtle);
  }

  .rp {
    font-size: 12.5px;
    color: var(--text-secondary);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    user-select: none;
    padding: 4px 4px 4px 0;
  }
  .rp:hover { color: var(--text-primary); }
  .rp input { accent-color: var(--accent-fill); margin: 0; }

  .primary {
    background: var(--accent-fill);
    color: #000;
    font-weight: 600;
    font-size: 13px;
    padding: 8px 16px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    transition: background-color var(--motion-fast) var(--ease-decel),
                transform var(--motion-fast) var(--ease-decel);
  }
  .primary:hover { background: var(--accent-strong); }
  .primary:active { background: var(--accent-rest); transform: translateY(1px); }
</style>
