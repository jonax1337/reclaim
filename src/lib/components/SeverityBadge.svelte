<script lang="ts">
  import type { Severity } from '../types';
  let { level }: { level: Severity } = $props();
  const labels: Record<Severity, string> = { safe: 'Safe', caution: 'Caution', risky: 'Risky' };
</script>

<span class="badge {level}">
  <span class="dot"></span>
  {labels[level]}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px 2px 6px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 500;
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    color: var(--text-secondary);
    line-height: 1.4;
  }
  .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .badge.safe    .dot { background: var(--severity-safe); }
  .badge.caution .dot { background: var(--severity-caution); }
  .badge.risky   .dot { background: var(--severity-risky); }

  .badge.caution { color: var(--warning); border-color: var(--warning-overlay-strong); }
  .badge.risky   { color: var(--severity-risky); border-color: var(--danger-stroke); }
</style>
