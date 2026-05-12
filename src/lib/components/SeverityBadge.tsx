import './SeverityBadge.css';
import type { Severity } from '../../types';

const labels: Record<Severity, string> = { safe: 'Safe', caution: 'Caution', risky: 'Risky' };

export function SeverityBadge({ level }: { level: Severity }) {
  return (
    <span className={`sev-badge ${level}`}>
      <span className="dot" />
      {labels[level]}
    </span>
  );
}
