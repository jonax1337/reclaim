<script lang="ts">
  import Icon from './Icon.svelte';
  let {
    open = $bindable<boolean>(false),
    title = 'Are you sure?',
    body = '',
    danger = false,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onconfirm
  }: {
    open: boolean;
    title?: string;
    body?: string;
    danger?: boolean;
    confirmLabel?: string;
    cancelLabel?: string;
    onconfirm?: () => void;
  } = $props();

  let confirmBtn = $state<HTMLButtonElement | null>(null);

  $effect(() => {
    if (open && confirmBtn) confirmBtn.focus();
  });

  function close() { open = false; }
  function confirm() { onconfirm?.(); open = false; }

  function onkeydown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Enter') confirm();
  }
</script>

<svelte:window on:keydown={onkeydown} />

{#if open}
  <div class="scrim" onclick={close} role="presentation"></div>
  <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="cd-title">
    <header>
      {#if danger}<Icon name="AlertTriangle" size={18} class="warn-icon" />{/if}
      <h2 id="cd-title">{title}</h2>
      <button class="close" aria-label="Close" onclick={close}><Icon name="X" size={14} /></button>
    </header>
    {#if body}<p>{body}</p>{/if}
    <footer>
      <button class="btn ghost" onclick={close}>{cancelLabel}</button>
      <button class="btn" class:danger onclick={confirm} bind:this={confirmBtn}>
        {confirmLabel}
      </button>
    </footer>
  </div>
{/if}

<style>
  .scrim {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.50);
    z-index: 900;
    animation: fade-in 150ms var(--ease-decel);
  }
  .dialog {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: min(440px, calc(100vw - 48px));
    background: var(--surface-overlay);
    backdrop-filter: blur(24px);
    border: 1px solid var(--stroke-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-flyout);
    padding: 20px 22px 16px;
    z-index: 901;
    animation: rise 200ms var(--ease-decel);
  }
  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes rise {
    from { opacity: 0; transform: translate(-50%, calc(-50% + 8px)) scale(0.98); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  header :global(.warn-icon) { color: var(--warning); flex-shrink: 0; }
  h2 {
    margin: 0;
    flex: 1;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.1px;
  }
  .close {
    color: var(--text-tertiary);
    padding: 4px;
    border-radius: 4px;
  }
  .close:hover { background: var(--surface-card-hover); color: var(--text-primary); }
  p {
    margin: 0 0 16px;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.55;
  }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
  }
  .btn {
    padding: 7px 14px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
    background: var(--accent-fill);
    color: var(--text-on-accent);
    border: 1px solid var(--accent-fill);
    transition: background-color var(--motion-fast) var(--ease-decel);
  }
  .btn:hover { background: var(--accent-strong); border-color: var(--accent-strong); }
  .btn.ghost {
    background: transparent;
    color: var(--text-primary);
    border-color: var(--stroke-default);
  }
  .btn.ghost:hover { background: var(--surface-card-hover); }
  .btn.danger {
    background: var(--danger);
    border-color: var(--danger);
    color: var(--text-on-accent);
  }
  .btn.danger:hover { background: var(--danger-strong); border-color: var(--danger-strong); }
</style>
