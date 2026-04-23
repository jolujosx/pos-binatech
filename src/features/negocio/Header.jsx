import { useOnline } from '../../hooks/useOnline';
import { useAuthStore } from '../auth/auth';
import { Link, useNavigate } from 'react-router-dom';

export default function Header() {
  const online = useOnline();
  const logout = useAuthStore(s => s.logout);
  const session = useAuthStore(s => s.session);
  const business = useAuthStore(s => s.business);
  const role = session?.user?.user_metadata?.role;
  const nav = useNavigate();

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      background: '#0f172a',
      color: '#fff',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
    }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', fontSize: 18, whiteSpace: 'nowrap' }}>
          🏪 {business?.name || 'Bina POS'}
        </span>
        <div style={{ display: 'flex', gap: 12, fontSize: 14 }}>
          <Link to="/" style={{ color: '#cbd5e1', textDecoration: 'none', padding: '6px 10px', borderRadius: 4 }}>POS</Link>
          <Link to="/productos" style={{ color: '#cbd5e1', textDecoration: 'none', padding: '6px 10px', borderRadius: 4 }}>Productos</Link>
          <Link to="/dashboard" style={{ color: '#cbd5e1', textDecoration: 'none', padding: '6px 10px', borderRadius: 4 }}>Dashboard</Link>
          {role === 'admin' && (
            <Link to="/admin" style={{ color: '#fbbf24', textDecoration: 'none', padding: '6px 10px', borderRadius: 4, fontWeight: 'bold' }}>
              ⚙️ Admin
            </Link>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{
          fontSize: 13,
          padding: '4px 8px',
          borderRadius: 4,
          background: online ? '#10b981' : '#ef4444',
          fontWeight: 500
        }}>
          {online ? '🟢 Online' : '🔴 Offline'}
        </span>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>
          {role === 'admin' ? '👑 Admin' : '👤 Cajero'}
        </span>
        <button
          onClick={() => { logout(); nav('/'); }}
          style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontWeight: 500 }}
        >
          Salir
        </button>
      </div>
    </nav>
  );
}