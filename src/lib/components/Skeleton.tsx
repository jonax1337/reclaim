import './Skeleton.css';

export function Skeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="skl-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skl-card" style={{ animationDelay: `${i * 60}ms` }}>
          <span className="skl-check" />
          <div className="skl-body">
            <span className="skl-line skl-w-40" />
            <span className="skl-line skl-w-90" />
            <span className="skl-line skl-w-70" />
            <span className="skl-line skl-w-30 small" />
          </div>
          <span className="skl-toggle" />
        </div>
      ))}
    </div>
  );
}
