import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  MessageBarActions,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import {
  Play16Filled,
  Eye16Regular,
  Dismiss16Regular
} from '@fluentui/react-icons';
import { useTweaks } from '../stores/tweaks';
import { useSettings } from '../stores/settings';
import { DiffDialog } from './DiffDialog';

const useStyles = makeStyles({
  wrap: {
    position: 'sticky',
    bottom: tokens.spacingVerticalL,
    marginTop: tokens.spacingVerticalL,
    marginLeft: tokens.spacingHorizontalXXL,
    marginRight: tokens.spacingHorizontalXXL,
    zIndex: 10,
    boxShadow: tokens.shadow16
  }
});

export function ApplyBar() {
  const s = useStyles();
  const selected = useTweaks((st) => st.selected);
  const tweaks = useTweaks((st) => st.tweaks);
  const applySelection = useTweaks((st) => st.applySelection);
  const restorePointDefault = useSettings((st) => st.restorePointDefault);

  const count = selected.size;
  const hasRisky = useMemo(
    () => tweaks.some((t) => selected.has(t.id) && t.severity === 'risky'),
    [tweaks, selected]
  );
  const smartRP = count >= 5 || hasRisky;

  const [restorePoint, setRestorePoint] = useState(restorePointDefault || smartRP);
  const [diffOpen, setDiffOpen] = useState(false);

  useEffect(() => {
    setRestorePoint(restorePointDefault || smartRP);
  }, [restorePointDefault, smartRP]);

  const selectedIds = useMemo(() => [...selected], [selected]);

  function clearSelection() {
    useTweaks.setState({ selected: new Set() });
  }

  if (count === 0) {
    return <DiffDialog open={diffOpen} onOpenChange={setDiffOpen} ids={selectedIds} />;
  }

  return (
    <>
      <div className={s.wrap}>
        <MessageBar intent={hasRisky ? 'warning' : 'info'}>
          <MessageBarBody>
            <MessageBarTitle>
              {count} tweak{count === 1 ? '' : 's'} selected
            </MessageBarTitle>
            {' '}
            <Checkbox
              checked={restorePoint}
              onChange={(_, d) => setRestorePoint(!!d.checked)}
              label="Create a system restore point first"
            />
          </MessageBarBody>
          <MessageBarActions
            containerAction={
              <Button
                appearance="subtle"
                icon={<Dismiss16Regular />}
                aria-label="Clear selection"
                onClick={clearSelection}
              />
            }
          >
            <Button
              appearance="secondary"
              icon={<Eye16Regular />}
              onClick={() => setDiffOpen(true)}
            >
              Preview
            </Button>
            <Button
              appearance="primary"
              icon={<Play16Filled />}
              onClick={() => void applySelection(restorePoint)}
            >
              Apply selected
            </Button>
          </MessageBarActions>
        </MessageBar>
      </div>

      <DiffDialog open={diffOpen} onOpenChange={setDiffOpen} ids={selectedIds} />
    </>
  );
}
