<script lang="ts">
  import Icon from './Icon.svelte';
  import { store } from '../stores/tweaks.svelte';
</script>

<div class="toasts" aria-live="polite">
  {#each store.toasts as t (t.id)}
    <div class="toast {t.kind}">
      <span class="icon">
        {#if t.kind === 'ok'}<Icon name="CheckCircle2" size={16} />
        {:else if t.kind === 'err'}<Icon name="XCircle" size={16} />
        {:else}<Icon name="Info" size={16} />{/if}
      </span>
      <span class="msg">{t.msg}</span>
      {#if t.action}
        <button
          class="action"
          onclick={async () => {
            await t.action!.run();
            store.dismissToast(t.id);
          }}
        >
          {t.action.label}
        </button>
      {/if}
      <button class="dismiss" aria-label="Dismiss" onclick={() => store.dismissToast(t.id)}>
        <Icon name="X" size={12} />
      </button>
    </div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    bottom: 24px;
    right: 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 1000;
    max-width: 420px;
  }
  .toast {
    display: grid;
    grid-template-columns: 16px 1fr auto auto;
    align-items: center;
    gap: 10px;
    padding: 10px 8px 10px 14px;
    background: var(--surface-overlay);
    backdrop-filter: blur(20px);
    border: 1px solid var(--stroke-default);
    border-radius: var(--radius-md);
    font-size: 13px;
    box-shadow: var(--shadow-flyout);
    animation: slide-in 220ms var(--ease-decel);
    pointer-events: auto;
  }
  @keyframes slide-in {
    from { transform: translateX(20px); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
  .toast.ok  { border-left: 3px solid var(--success); }
  .toast.ok .icon  { color: var(--success); }
  .toast.err { border-left: 3px solid var(--danger); }
  .toast.err .icon { color: var(--danger); }
  .toast.err .msg  { color: var(--danger); }
  .toast.info{ border-left: 3px solid var(--accent-default); }
  .toast.info .icon{ color: var(--accent-default); }

  .icon { display: inline-flex; }
  .msg { line-height: 1.4; }
  .action {
    padding: 4px 10px;
    border-radius: 4px;
    background: transparent;
    border: 1px solid var(--stroke-default);
    color: var(--accent-text);
    font-size: 12px;
    font-weight: 500;
    transition: background-color var(--motion-fast) var(--ease-decel);
  }
  .action:hover { background: var(--surface-card-hover); }
  .dismiss {
    color: var(--text-tertiary);
    padding: 4px;
    border-radius: 4px;
    display: inline-flex;
  }
  .dismiss:hover { background: var(--surface-card-hover); color: var(--text-primary); }
</style>
