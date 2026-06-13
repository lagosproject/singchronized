
export default function StatusBanner({ status }) {
  if (!status) return null;

  const color = status.type === 'success' ? 'var(--success)'
    : status.type === 'error' ? 'var(--danger)'
    : 'var(--secondary)';
  const background = status.type === 'success' ? 'rgba(16, 185, 129, 0.15)'
    : status.type === 'error' ? 'rgba(239, 68, 68, 0.15)'
    : 'rgba(59, 130, 246, 0.15)';

  return (
    <div style={{
      padding: '12px',
      borderRadius: '8px',
      fontSize: '0.85rem',
      background,
      color,
      border: `1px solid ${color}`
    }}>
      {status.message}
    </div>
  );
}
