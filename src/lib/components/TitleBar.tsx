import { useEffect, useState } from 'react';
import { makeStyles, mergeClasses, tokens, Text } from '@fluentui/react-components';
import {
  Subtract16Regular,
  Square16Regular,
  SquareMultiple16Regular,
  Dismiss16Regular,
  Flash16Filled
} from '@fluentui/react-icons';
import { getCurrentWindow } from '@tauri-apps/api/window';

const win = getCurrentWindow();

const useStyles = makeStyles({
  root: {
    flexShrink: 0,
    height: '40px',
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalL,
    paddingLeft: tokens.spacingHorizontalL,
    userSelect: 'none',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: 'transparent'
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground2
  },
  logo: { display: 'inline-flex', color: tokens.colorBrandForeground1 },
  title: { fontWeight: tokens.fontWeightSemibold, letterSpacing: '0.2px' },
  spacer: { height: '100%' },
  controls: { display: 'flex', height: '100%' },
  ctl: {
    width: '46px',
    height: '100%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForeground2,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transitionDuration: tokens.durationFaster,
    transitionTimingFunction: tokens.curveDecelerateMax,
    transitionProperty: 'background-color, color',
    ':hover': {
      backgroundColor: tokens.colorSubtleBackgroundHover,
      color: tokens.colorNeutralForeground1
    },
    ':focus-visible': {
      outlineStyle: 'solid',
      outlineWidth: '2px',
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: '-2px'
    }
  },
  close: {
    ':hover': {
      backgroundColor: '#c42b1c',
      color: '#fff'
    }
  }
});

export function TitleBar() {
  const s = useStyles();
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
    <div className={s.root} data-tauri-drag-region>
      <div className={s.brand} data-tauri-drag-region>
        <span className={s.logo} aria-hidden><Flash16Filled /></span>
        <Text size={200} className={s.title}>Reclaim</Text>
      </div>
      <div className={s.spacer} data-tauri-drag-region />
      <div className={s.controls}>
        <button className={s.ctl} aria-label="Minimize" onClick={() => win.minimize()}>
          <Subtract16Regular />
        </button>
        <button className={s.ctl} aria-label={maximized ? 'Restore' : 'Maximize'} onClick={toggleMax}>
          {maximized ? <SquareMultiple16Regular /> : <Square16Regular />}
        </button>
        <button className={mergeClasses(s.ctl, s.close)} aria-label="Close" onClick={() => win.close()}>
          <Dismiss16Regular />
        </button>
      </div>
    </div>
  );
}
