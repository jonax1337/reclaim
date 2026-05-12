import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Icon } from './Icon';
import './TitleBar.css';

const win = getCurrentWindow();

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    win.isMaximized().then(setMaximized);
    let dispose: (() => void) | undefined;
    win.onResized(() => { win.isMaximized().then(setMaximized); }).then((fn) => { dispose = fn; });
    return () => { dispose?.(); };
  }, []);

  async function toggleMax() {
    await win.toggleMaximize();
    setMaximized(await win.isMaximized());
  }

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="brand" data-tauri-drag-region>
        <span className="logo" aria-hidden><Icon name="Zap" size={13} bold /></span>
        <span className="title">Reclaim</span>
      </div>
      <div className="spacer" data-tauri-drag-region />
      <div className="controls">
        <button className="ctl" aria-label="Minimize" onClick={() => win.minimize()}><Icon name="Minus" size={14} /></button>
        <button className="ctl" aria-label={maximized ? 'Restore' : 'Maximize'} onClick={toggleMax}>
          <Icon name={maximized ? 'WindowMultiple' : 'Maximize'} size={12} />
        </button>
        <button className="ctl close" aria-label="Close" onClick={() => win.close()}><Icon name="X" size={14} /></button>
      </div>
    </div>
  );
}
