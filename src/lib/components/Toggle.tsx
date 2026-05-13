import { Switch } from '@fluentui/react-components';

type Props = {
  checked: boolean;
  disabled?: boolean;
  label?: string;
  onChange?: () => void;
};

export function Toggle({ checked, disabled = false, label = 'Toggle', onChange }: Props) {
  return (
    <Switch
      checked={checked}
      disabled={disabled}
      aria-label={label}
      onChange={() => onChange?.()}
    />
  );
}
