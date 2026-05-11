<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { Download, ExternalLink, Search } from 'lucide-svelte';
  import { store } from '../stores/tweaks.svelte';

  let query = $state('');
  let installing = $state<Set<string>>(new Set());

  let categories = $derived(
    Array.from(new Set(store.apps.map((a) => a.category))).sort()
  );

  let filtered = $derived(
    store.apps.filter((a) =>
      query === '' ||
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.description.toLowerCase().includes(query.toLowerCase())
    )
  );

  async function install(id: string) {
    const next = new Set(installing); next.add(id); installing = next;
    try {
      await invoke('install_winget_app', { id });
      store.toast({ kind: 'ok', msg: `Installed ${id}` });
    } catch (e) {
      store.toast({ kind: 'err', msg: `${id}: ${e}` });
    } finally {
      const n = new Set(installing); n.delete(id); installing = n;
    }
  }
</script>

<header class="hdr">
  <p class="lede">Curated list installed via <code>winget</code>. Silent &amp; unattended.</p>
  <div class="search">
    <Search size={14} />
    <input type="search" bind:value={query} placeholder="Search apps…" />
  </div>
</header>

{#each categories as cat}
  {@const list = filtered.filter((a) => a.category === cat)}
  {#if list.length > 0}
    <h3 class="cat">{cat}</h3>
    <div class="grid">
      {#each list as app (app.id)}
        <article class="app">
          <div class="meta">
            <h4>{app.name}</h4>
            <p>{app.description}</p>
            <code>{app.id}</code>
          </div>
          <div class="actions">
            {#if app.homepage}
              <a class="link" href={app.homepage} target="_blank" rel="noreferrer noopener" title="Homepage">
                <ExternalLink size={14} />
              </a>
            {/if}
            <button
              class="install"
              disabled={installing.has(app.id)}
              onclick={() => install(app.id)}
            >
              <Download size={14} />
              {installing.has(app.id) ? 'Installing…' : 'Install'}
            </button>
          </div>
        </article>
      {/each}
    </div>
  {/if}
{/each}

<style>
  .hdr {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 20px;
  }
  .lede { margin: 0; color: var(--text-secondary); font-size: 13px; }
  .hdr code { background: var(--surface-card-active); padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: var(--font-mono); }
  .search { position: relative; width: 280px; }
  .search input { padding-left: 28px; width: 100%; }
  .search :global(svg) {
    position: absolute; left: 8px; top: 50%; transform: translateY(-50%);
    color: var(--text-tertiary);
  }
  .cat {
    margin: 24px 0 10px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--text-tertiary);
    font-weight: 600;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px;
  }
  .app {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 12px 14px;
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    border-radius: var(--radius-md);
    transition: background-color var(--motion-fast) var(--ease-decel);
  }
  .app:hover { background: var(--surface-card-hover); }
  .meta { flex: 1; min-width: 0; }
  h4 { margin: 0 0 2px; font-size: 13px; font-weight: 600; }
  .meta p { margin: 0 0 4px; font-size: 12px; color: var(--text-secondary); line-height: 1.4; }
  .meta code { font-size: 10px; color: var(--text-tertiary); font-family: var(--font-mono); }
  .actions { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
  .link {
    color: var(--text-tertiary);
    padding: 4px;
    border-radius: 4px;
    display: inline-flex;
  }
  .link:hover { background: var(--surface-card-active); color: var(--text-primary); }
  .install {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 10px;
    background: var(--surface-card-active);
    border: 1px solid var(--stroke-default);
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 500;
    color: var(--text-primary);
    transition: all var(--motion-fast) var(--ease-decel);
  }
  .install:hover:not([disabled]) { background: var(--accent-fill); color: #000; border-color: var(--accent-fill); }
  .install[disabled] { opacity: 0.5; cursor: progress; }
</style>
