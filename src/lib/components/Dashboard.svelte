<script lang="ts">
  import { ShieldCheck, Activity, Cpu, AlertOctagon } from 'lucide-svelte';
  import { store } from '../stores/tweaks.svelte';

  let total = $derived(store.tweaks.length);
  let appliedCount = $derived(store.applied.size);
  let info = $derived(store.systemInfo);
  let osLabel = $derived(info?.os_name?.replace('Microsoft ', '') ?? '');
</script>

<div class="hero">
  <span class="kicker">Welcome back</span>
  <h1>Reclaim your Windows.</h1>
  <p class="lede">
    Reversible tweaks for privacy, bloatware, performance and more.
    Pick a preset or curate your own.
  </p>
</div>

<div class="stats">
  <div class="stat">
    <div class="icon"><Activity size={16} strokeWidth={1.75} /></div>
    <div class="value">{appliedCount}</div>
    <div class="label">Tweaks applied</div>
  </div>

  <div class="stat">
    <div class="icon"><ShieldCheck size={16} strokeWidth={1.75} /></div>
    <div class="value">{total}</div>
    <div class="label">Tweaks available</div>
  </div>

  {#if info}
    <div class="stat">
      <div class="icon"><Cpu size={16} strokeWidth={1.75} /></div>
      <div class="value text">{osLabel || 'Windows'}</div>
      <div class="label">Build {info.build}</div>
    </div>

    {#if !info.is_admin}
      <div class="stat warn">
        <div class="icon"><AlertOctagon size={16} strokeWidth={1.75} /></div>
        <div class="value text">Not admin</div>
        <div class="label">Some tweaks will fail</div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .hero {
    padding: 28px 28px 26px;
    background:
      radial-gradient(circle at 0% 0%, rgba(76,194,255,0.12), transparent 55%),
      var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    border-radius: var(--radius-lg);
    margin-bottom: 14px;
  }
  .kicker {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: var(--accent-text);
    font-weight: 600;
  }
  h1 {
    margin: 8px 0 10px;
    font-size: 30px;
    font-weight: 600;
    letter-spacing: -0.6px;
    line-height: 1.15;
  }
  .lede {
    margin: 0;
    max-width: 60ch;
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.55;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
    margin-bottom: 18px;
  }
  .stat {
    position: relative;
    padding: 14px 16px 13px;
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    border-radius: var(--radius-md);
    transition: border-color var(--motion-fast) var(--ease-decel),
                background-color var(--motion-fast) var(--ease-decel);
  }
  .stat:hover { border-color: var(--stroke-default, var(--stroke-subtle)); }
  .icon {
    position: absolute;
    top: 12px;
    right: 14px;
    color: var(--text-tertiary);
    opacity: 0.85;
  }
  .value {
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.3px;
    line-height: 1.15;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }
  .value.text { font-size: 17px; letter-spacing: -0.2px; }
  .label {
    margin-top: 6px;
    font-size: 11.5px;
    color: var(--text-tertiary);
    letter-spacing: 0.2px;
  }
  .stat.warn {
    border-color: rgba(252,225,0,0.30);
    background: linear-gradient(180deg, rgba(252,225,0,0.05), transparent 60%), var(--surface-card);
  }
  .stat.warn .value { color: var(--warning); }
  .stat.warn .icon { color: var(--warning); opacity: 1; }
</style>
