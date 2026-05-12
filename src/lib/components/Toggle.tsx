import './Toggle.css';

type Props = {
  checked: boolean;
  disabled?: boolean;
  label?: string;
  onChange?: () => void;
};

export function Toggle({ checked, disabled = false, label = 'Toggle', onChange }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`toggle${checked ? ' on' : ''}`}
      onClick={() => onChange?.()}
    >
      <span className="thumb" />
    </button>
  );
}
