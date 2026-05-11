<script lang="ts">
  import Icon from './Icon.svelte';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  const win = getCurrentWindow();
</script>

<div class="titlebar" data-tauri-drag-region>
  <div class="brand" data-tauri-drag-region>
    <span class="logo" aria-hidden="true"><Icon name="Zap" size={13} bold /></span>
    <span class="title">Reclaim</span>
  </div>

  <div class="spacer" data-tauri-drag-region></div>

  <div class="controls">
    <button class="ctl" aria-label="Minimize" onclick={() => win.minimize()}><Icon name="Minus" size={14} /></button>
    <button class="ctl" aria-label="Maximize" onclick={() => win.toggleMaximize()}><Icon name="Square" size={12} /></button>
    <button class="ctl close" aria-label="Close" onclick={() => win.close()}><Icon name="X" size={14} /></button>
  </div>
</div>

<style>
  .titlebar {
    height: 40px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 16px;
    padding-left: 16px;
    user-select: none;
    border-bottom: 1px solid var(--stroke-subtle);
  }
  .brand { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-secondary); }
  .logo { display: inline-flex; color: var(--accent-default); }
  .title { font-weight: 600; letter-spacing: 0.2px; }

  .spacer { height: 100%; }

  .controls { display: flex; height: 100%; }
  .ctl {
    width: 46px; height: 100%;
    display: inline-flex; align-items: center; justify-content: center;
    color: var(--text-secondary);
    transition: background-color var(--motion-fast) var(--ease-decel);
  }
  .ctl:hover { background: var(--surface-card-hover); color: var(--text-primary); }
  .ctl.close:hover { background: #c42b1c; color: #fff; }
</style>
