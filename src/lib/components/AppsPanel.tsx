import { useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icon } from './Icon';
import { useTweaks } from '../stores/tweaks';
import './AppsPanel.css';

export function AppsPanel() {
  const apps = useTweaks((s) => s.apps);
  const toast = useTweaks((s) => s.toast);

  const [query, setQuery] = useState('');
  const [installing, setInstalling] = useState<Set<string>>(new Set());

  const categories = useMemo(
    () => Array.from(new Set(apps.map((a) => a.category))).sort(),
    [apps]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return apps.filter(
      (a) =>
        query === '' ||
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }, [apps, query]);

  async function install(id: string) {
    setInstalling((prev) => {
      const n = new Set(prev);
      n.add(id);
      return n;
    });
    try {
      await invoke('install_winget_app', { id });
      toast({ kind: 'ok', msg: `Installed ${id}` });
    } catch (e) {
      toast({ kind: 'err', msg: `${id}: ${e}` });
    } finally {
      setInstalling((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  }

  return (
    <div className="apps-panel">
      <header className="hdr">
        <p className="lede">
          Curated list installed via <code>winget</code>. Silent &amp; unattended.
        </p>
        <div className="search">
          <Icon name="Search" size={14} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps…"
          />
        </div>
      </header>

      {categories.map((cat) => {
        const list = filtered.filter((a) => a.category === cat);
        if (list.length === 0) return null;
        return (
          <div key={cat}>
            <h3 className="cat">{cat}</h3>
            <div className="grid">
              {list.map((app) => (
                <article key={app.id} className="app">
                  <div className="meta">
                    <h4>{app.name}</h4>
                    <p>{app.description}</p>
                    <code>{app.id}</code>
                  </div>
                  <div className="actions">
                    {app.homepage && (
                      <a
                        className="link"
                        href={app.homepage}
                        target="_blank"
                        rel="noreferrer noopener"
                        title="Homepage"
                      >
                        <Icon name="ExternalLink" size={14} />
                      </a>
                    )}
                    <button
                      className="install"
                      disabled={installing.has(app.id)}
                      onClick={() => install(app.id)}
                    >
                      <Icon name="Download" size={14} />
                      {installing.has(app.id) ? 'Installing…' : 'Install'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
