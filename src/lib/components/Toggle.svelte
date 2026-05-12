<script lang="ts">
  let {
    checked,
    disabled = false,
    label = 'Toggle',
    onchange
  }: {
    checked: boolean;
    disabled?: boolean;
    label?: string;
    onchange?: () => void;
  } = $props();
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  aria-label={label}
  {disabled}
  class="toggle"
  class:on={checked}
  onclick={() => onchange?.()}
>
  <span class="thumb"></span>
</button>

<style>
  .toggle {
    width: 40px; height: 20px;
    border-radius: 999px;
    background: transparent;
    border: 1px solid var(--text-secondary);
    position: relative;
    transition:
      background-color var(--motion-fast) var(--ease-decel),
      border-color var(--motion-fast) var(--ease-decel);
    flex-shrink: 0;
  }
  .toggle:hover:not([disabled]) {
    background: var(--surface-card-hover);
    border-color: var(--text-primary);
  }
  .toggle.on {
    background: var(--accent-fill);
    border-color: var(--accent-fill);
  }
  .toggle.on:hover:not([disabled]) {
    background: var(--accent-strong);
    border-color: var(--accent-strong);
  }
  .toggle[disabled] { opacity: 0.4; cursor: not-allowed; }

  .thumb {
    position: absolute;
    top: 50%;
    left: 4px;
    width: 10px; height: 10px;
    border-radius: 50%;
    background: var(--text-secondary);
    transform: translateY(-50%);
    /* Fluent spring-ish: overshoot then settle */
    transition:
      left 250ms cubic-bezier(0.34, 1.20, 0.64, 1.00),
      width 180ms var(--ease-decel),
      background-color var(--motion-fast) var(--ease-decel);
  }
  .toggle:hover:not([disabled]) .thumb { background: var(--text-primary); }
  .toggle.on .thumb {
    left: 22px;
    background: var(--text-on-accent);
    width: 14px;
    height: 14px;
  }
  .toggle.on:hover:not([disabled]) .thumb { width: 16px; left: 21px; }
  .toggle:active:not([disabled]) .thumb { width: 18px; }
  .toggle.on:active:not([disabled]) .thumb { width: 18px; left: 19px; }

  @media (prefers-reduced-motion: reduce) {
    .thumb { transition: none; }
  }
</style>
