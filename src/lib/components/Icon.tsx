import type { CSSProperties } from 'react';
import { iconRegular, iconFilled, type FluentIconName } from '../icons';

type Props = {
  name: FluentIconName;
  size?: number;
  bold?: boolean;
  className?: string;
};

export function Icon({ name, size = 20, bold = false, className }: Props) {
  const Comp = (bold && iconFilled[name]) || iconRegular[name];
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    lineHeight: 0,
    flexShrink: 0,
    fontSize: size
  };
  return (
    <span className={['icon', className].filter(Boolean).join(' ')} style={style}>
      <Comp className={className} />
    </span>
  );
}
