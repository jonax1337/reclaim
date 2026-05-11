<script lang="ts">
  import Iconify from '@iconify/svelte';
  import { iconMap, type FluentIconName } from '../icons';

  type Props = {
    name: FluentIconName;
    size?: number;
    bold?: boolean;
    strokeWidth?: number; // ignored — kept for drop-in API compat
    class?: string;
  };

  let { name, size = 20, bold = false, class: className = '' }: Props = $props();
</script>

<span class="icon" class:bold style:--icon-size="{size}px">
  <Iconify icon={iconMap[name]} width={size} height={size} class={className} />
</span>

<style>
  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--icon-size);
    height: var(--icon-size);
    line-height: 0;
    flex-shrink: 0;
  }
  /* Thicken the stroke of the (filled) Fluent paths without changing layout. */
  .icon.bold :global(svg path) {
    stroke: currentColor;
    stroke-width: 1.25;
    paint-order: stroke fill;
  }
</style>
