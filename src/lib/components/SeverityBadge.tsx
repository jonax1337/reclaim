import { Badge } from '@fluentui/react-components';
import type { Severity } from '../../types';

const labels: Record<Severity, string> = { safe: 'Safe', caution: 'Caution', risky: 'Risky' };
const colors: Record<Severity, 'success' | 'warning' | 'danger'> = {
  safe: 'success',
  caution: 'warning',
  risky: 'danger'
};

export function SeverityBadge({ level }: { level: Severity }) {
  return (
    <Badge appearance="tint" color={colors[level]} size="small">
      {labels[level]}
    </Badge>
  );
}
